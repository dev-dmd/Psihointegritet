"""Diagnostic Engine — runner (DIAGNOSTIC_TODO.md §3).

The runner is the only code that invokes a collector. It constructs an
immutable ``DiagnosticContext``, calls the collector and wraps every outcome
— including an unhandled exception — into a ``DiagnosticResult``.

The runner itself is authorization-free. Access control belongs in the router
adapter (layering rule §14.1).
"""

import logging
import time
from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from psihointegritet.modules.diagnostics.contracts import (
    DiagnosticContext,
    DiagnosticDefinition,
    DiagnosticMode,
    DiagnosticResult,
    DiagnosticStatus,
)
from psihointegritet.modules.diagnostics.registry import get_definition

logger = logging.getLogger("psihointegritet.diagnostics")


async def run_one(
    key: str,
    *,
    session: AsyncSession,
    organization_id: UUID | None,
    mode: DiagnosticMode,
    sample_limit: int = 5,
) -> DiagnosticResult:
    """Find, invoke and timing-wrap a single collector (D3.1)."""
    start_ns = time.perf_counter_ns()
    checked_at = datetime.now(UTC)
    definition = get_definition(key)

    effective_limit = min(sample_limit, definition.max_sample_rows)
    context = DiagnosticContext(
        session=session,
        organization_id=organization_id,
        mode=mode,
        sample_limit=effective_limit,
        checked_at=checked_at,
    )

    try:
        result = await definition.collector(
            session=context.session,
            organization_id=context.organization_id,
            mode=context.mode,
            sample_limit=context.sample_limit,
            checked_at=context.checked_at,
        )
    except Exception:
        logger.exception("Diagnostic collector failed: %s", definition.key)
        duration_ms = int((time.perf_counter_ns() - start_ns) // 1_000_000)
        return DiagnosticResult(
            key=definition.key,
            status=DiagnosticStatus.FAILED,
            affected_count=0,
            summary="Collector raised an unhandled exception.",
            duration_ms=duration_ms,
            checked_at=checked_at,
        )

    # Override duration with our own measurement (the collector might have
    # made its own clock, but the runner is the authority).
    duration_ms = int((time.perf_counter_ns() - start_ns) // 1_000_000)

    return DiagnosticResult(
        key=definition.key,
        status=result.status,
        affected_count=result.affected_count,
        summary=result.summary,
        sample_rows=result.sample_rows[:effective_limit],
        suggestion=result.suggestion,
        duration_ms=duration_ms,
        checked_at=checked_at,
    )


async def run_many(
    *,
    keys: list[str] | None = None,
    category: str | None = None,
    session: AsyncSession,
    organization_id: UUID | None,
    mode: DiagnosticMode,
    sample_limit: int = 5,
) -> list[DiagnosticResult]:
    """Run several diagnostics; one failure does not stop the rest (D3.2)."""
    definitions: list[DiagnosticDefinition]
    if keys is not None:
        definitions = [get_definition(k) for k in keys]
    elif category is not None:
        from psihointegritet.modules.diagnostics.registry import list_definitions

        definitions = [d for d in list_definitions() if d.category == category]
    else:
        from psihointegritet.modules.diagnostics.registry import list_definitions

        definitions = list_definitions()

    results: list[DiagnosticResult] = []
    for definition in definitions:
        result = await run_one(
            definition.key,
            session=session,
            organization_id=organization_id,
            mode=mode,
            sample_limit=sample_limit,
        )
        results.append(result)
    return results
