"""Diagnostic Engine — contracts (DIAGNOSTIC_TODO.md §1).

Pure domain types shared by registry, runner, collectors and API. No database,
no routers, no I/O.

.. attention::
   ``DiagnosticDefinition.collector`` is typed as ``Callable[..., Awaitable[...]]``
   without a ``Protocol`` class. A ``Protocol`` would reject functions declared
   with ``session: AsyncSession`` or ``organization_id`` keyword arguments as
   incompatible, since those names are not ``DiagnosticContext`` member names.
   The duck-typed signature is validated by the registry at import time and by
   tests (D-Common-3, D-Common-4).
"""

from collections.abc import Awaitable, Callable
from dataclasses import dataclass
from datetime import UTC, datetime
from enum import StrEnum
from uuid import UUID

from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession


class DiagnosticStatus(StrEnum):
    """Outcome of a single diagnostic check.

    Ordered by severity from *nothing to report* through *operator should look*
    to *something is definitely wrong*.
    """

    OK = "ok"
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    FAILED = "failed"


class DiagnosticMode(StrEnum):
    """How many sample rows the caller wants."""

    COMPACT = "compact"  # 0-1 samples
    FULL = "full"  # up to max_sample_rows


class DiagnosticResult(BaseModel):
    """One collector run outcome — the only model the API layer sees."""

    key: str = Field(description="Stable registry key, e.g. 'booking.appointment_overlaps'")
    status: DiagnosticStatus
    affected_count: int = Field(ge=0, description="Total matching rows (COUNT), never len(sample)")
    summary: str = Field(description="One-sentence finding, even when ok")
    sample_rows: list[dict[str, object]] = Field(  # pyright: ignore[reportUnknownVariableType]
        default_factory=list,
        description=("Evidence identifiers (no PII). Clipped to sample_limit & max_sample_rows."),
    )
    suggestion: str | None = Field(default=None, description="Recommended repair, null when ok")
    duration_ms: int = Field(ge=0)
    checked_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


@dataclass(frozen=True)
class DiagnosticContext:
    """Immutable snapshot the runner constructs before calling a collector.

    ``organization_id=None`` means global scope, allowed only for superadmin.
    """

    session: AsyncSession
    organization_id: UUID | None
    mode: DiagnosticMode
    sample_limit: int
    checked_at: datetime


#: Collector type alias — deliberately broad so functions declared with
#: keyword-only session/organization_id/mode parameters are still valid.
CollectorFunc = Callable[..., Awaitable[DiagnosticResult]]


@dataclass(frozen=True, slots=True)
class DiagnosticDefinition:
    """One entry in the explicit diagnostic registry.

    .. attention::

       ``collector`` receives ``**kwargs`` unpacked from ``DiagnosticContext``
       so the named parameters of the collector function must match the
       context attribute names (``session``, ``organization_id``, etc.).
    """

    key: str
    label: str
    description: str
    collector: CollectorFunc
    category: str
    supported_modes: frozenset[DiagnosticMode]
    max_sample_rows: int
    tenant_aware: bool
