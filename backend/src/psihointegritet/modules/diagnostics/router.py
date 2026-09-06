"""Diagnostic Engine — read-only API (DIAGNOSTIC_TODO.md §6).

Every route is gated behind ``RequireSuperadmin`` (§0/D0). The runner owns
execution; the router adapts HTTP to the runner contract (layering rule §14.1).
"""

from datetime import UTC, datetime

from fastapi import APIRouter, HTTPException, status

from psihointegritet.api.dependencies import (
    DatabaseSession,
    RequireSuperadmin,
)
from psihointegritet.modules.diagnostics.contracts import DiagnosticStatus
from psihointegritet.modules.diagnostics.registry import (
    DiagnosticKeyUnknownError,
    list_definitions,
)
from psihointegritet.modules.diagnostics.runner import run_many, run_one
from psihointegritet.modules.diagnostics.schemas import (
    DiagnosticDefinitionOut,
    DiagnosticRunRequest,
    DiagnosticRunResponse,
    DiagnosticRunSummary,
)

router = APIRouter(prefix="/superadmin/diagnostics", tags=["diagnostics"])


@router.get("", response_model=list[DiagnosticDefinitionOut])
async def list_diagnostics(
    _actor: RequireSuperadmin,
) -> list[DiagnosticDefinitionOut]:
    """List all registered diagnostic definitions (D6.1).

    No execution — returns key, label, description, category and supported
    modes for every entry in the diagnostic registry.
    """
    return [
        DiagnosticDefinitionOut(
            key=d.key,
            label=d.label,
            description=d.description,
            category=d.category,
            supported_modes=list(d.supported_modes),
            tenant_aware=d.tenant_aware,
        )
        for d in list_definitions()
    ]


@router.post("/run", response_model=DiagnosticRunResponse)
async def run_diagnostics(
    body: DiagnosticRunRequest,
    _actor: RequireSuperadmin,
    session: DatabaseSession,
) -> DiagnosticRunResponse:
    """Run diagnostics by category or all registered (D6.2).

    ``organizationId: null`` is superadmin-only global scope (D6.5).
    """
    results = await run_many(
        category=body.category,
        session=session,
        organization_id=body.organization_id,
        mode=body.mode,
    )

    summary = DiagnosticRunSummary()
    for r in results:
        if r.status == DiagnosticStatus.OK:
            summary.ok += 1
        elif r.status == DiagnosticStatus.INFO:
            summary.info += 1
        elif r.status == DiagnosticStatus.WARNING:
            summary.warning += 1
        elif r.status == DiagnosticStatus.ERROR:
            summary.error += 1
        elif r.status == DiagnosticStatus.FAILED:
            summary.failed += 1

    return DiagnosticRunResponse(
        results=results,
        summary=summary,
        checked_at=results[0].checked_at if results else datetime.now(UTC),
    )


@router.post("/{key}/run", response_model=DiagnosticRunResponse)
async def run_single_diagnostic(
    key: str,
    body: DiagnosticRunRequest,
    _actor: RequireSuperadmin,
    session: DatabaseSession,
) -> DiagnosticRunResponse:
    """Run a single diagnostic by key (D6.3)."""
    try:
        result = await run_one(
            key,
            session=session,
            organization_id=body.organization_id,
            mode=body.mode,
        )
    except DiagnosticKeyUnknownError as error:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "code": "DIAGNOSTIC_NOT_FOUND",
                "message": str(error),
            },
        ) from error

    summary = DiagnosticRunSummary()
    if result.status == DiagnosticStatus.OK:
        summary.ok += 1
    elif result.status == DiagnosticStatus.INFO:
        summary.info += 1
    elif result.status == DiagnosticStatus.WARNING:
        summary.warning += 1
    elif result.status == DiagnosticStatus.ERROR:
        summary.error += 1
    elif result.status == DiagnosticStatus.FAILED:
        summary.failed += 1

    return DiagnosticRunResponse(
        results=[result],
        summary=summary,
        checked_at=result.checked_at,
    )
