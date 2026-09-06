"""Diagnostic Engine — API schemas (DIAGNOSTIC_TODO.md §6)."""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field

from psihointegritet.modules.diagnostics.contracts import DiagnosticMode, DiagnosticResult


class DiagnosticDefinitionOut(BaseModel):
    """Public summary of a registered diagnostic (D6.1)."""

    key: str
    label: str
    description: str
    category: str
    supported_modes: list[DiagnosticMode]
    tenant_aware: bool

    model_config = {"from_attributes": True}


class DiagnosticRunRequest(BaseModel):
    """Request body for ``POST .../run`` (D6.2) and ``POST .../{key}/run`` (D6.3)."""

    category: str | None = Field(default=None, description="Run all diagnostics in this category")
    mode: DiagnosticMode = Field(default=DiagnosticMode.COMPACT)
    organization_id: UUID | None = Field(
        default=None,
        description="Tenant scope; null = global (superadmin only)",
    )


class DiagnosticRunSummary(BaseModel):
    """Aggregated counts across all results in one run."""

    ok: int = 0
    info: int = 0
    warning: int = 0
    error: int = 0
    failed: int = 0


class DiagnosticRunResponse(BaseModel):
    """Aggregated response for ``POST .../run`` (D6.2)."""

    results: list[DiagnosticResult]
    summary: DiagnosticRunSummary
    checked_at: datetime
