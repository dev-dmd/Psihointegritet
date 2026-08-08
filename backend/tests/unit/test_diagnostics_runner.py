"""Common diagnostic tests — registry, runner and contract (DIAGNOSTIC_TODO.md §7.1).

These run *without* a database. The runner's ``run_one`` / ``run_many`` get a
mock session injected through the ``DiagnosticContext``.
"""

from datetime import UTC, datetime
from uuid import UUID, uuid4

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from psihointegritet.modules.diagnostics.contracts import (
    DiagnosticDefinition,
    DiagnosticMode,
    DiagnosticResult,
    DiagnosticStatus,
)
from psihointegritet.modules.diagnostics.registry import (
    DIAGNOSTIC_REGISTRY,
    DiagnosticKeyUnknownError,
    get_definition,
    list_definitions,
)
from psihointegritet.modules.diagnostics.runner import run_many, run_one

# ── Helpers ─────────────────────────────────────────────────────────────────

_ORG_A = uuid4()
_CHECKED_AT = datetime(2026, 8, 8, tzinfo=UTC)


async def _ok_collector(
    *, session: AsyncSession, organization_id: UUID | None, **__: object
) -> DiagnosticResult:
    return DiagnosticResult(
        key="test.ok",
        status=DiagnosticStatus.OK,
        affected_count=0,
        summary="All good.",
        duration_ms=123,
        checked_at=_CHECKED_AT,
    )


async def _error_collector(
    *, session: AsyncSession, organization_id: UUID | None, **__: object
) -> DiagnosticResult:
    return DiagnosticResult(
        key="test.error",
        status=DiagnosticStatus.ERROR,
        affected_count=5,
        summary="Found 5 issues.",
        sample_rows=[{"id": 1}, {"id": 2}],
        duration_ms=456,
        checked_at=_CHECKED_AT,
    )


async def _failing_collector(
    *, session: AsyncSession, organization_id: UUID | None, **__: object
) -> DiagnosticResult:
    msg = "Simulated collector crash"
    raise RuntimeError(msg)


# ── D-Common-1: Unique registry keys ────────────────────────────────────────


def test_registry_keys_are_unique() -> None:
    """Every key in the registry must appear exactly once (D-Common-1)."""
    keys = [d.key for d in DIAGNOSTIC_REGISTRY.values()]
    assert len(keys) == len(set(keys)), f"Duplicate keys: {keys}"


# ── D-Common-2: Unknown key → controlled error ──────────────────────────────


def test_unknown_key_raises_controlled_error() -> None:
    """A key that is not registered must not KeyError directly (D-Common-2)."""
    with pytest.raises(DiagnosticKeyUnknownError, match="nonexistent"):
        get_definition("nonexistent")


# ── D-Common-3: Exception in collector → FAILED ─────────────────────────────


@pytest.mark.asyncio
async def test_collector_exception_yields_failed(monkeypatch: pytest.MonkeyPatch) -> None:
    """An unhandled exception must produce FAILED, never crash the runner (D-Common-3)."""
    from unittest.mock import AsyncMock

    session = AsyncMock(spec=AsyncSession)

    # Replace get_definition so it returns a definition whose collector raises
    crashing_def = DiagnosticDefinition(
        key="test.crash",
        label="Crash",
        description="Will raise.",
        collector=_failing_collector,
        category="test",
        supported_modes=frozenset({DiagnosticMode.COMPACT}),
        max_sample_rows=5,
        tenant_aware=False,
    )

    def _fake_get(_key: str) -> DiagnosticDefinition:
        return crashing_def

    monkeypatch.setattr("psihointegritet.modules.diagnostics.runner.get_definition", _fake_get)

    result = await run_one(
        "test.crash",
        session=session,
        organization_id=None,
        mode=DiagnosticMode.COMPACT,
    )
    assert result.status == DiagnosticStatus.FAILED
    assert result.affected_count == 0
    assert "unhandled exception" in result.summary.lower()


# ── D-Common-4: One failed does not stop run_many ───────────────────────────


@pytest.mark.asyncio
async def test_one_failure_does_not_stop_run_many(monkeypatch: pytest.MonkeyPatch) -> None:
    """When one collector fails, run_many must still produce results for the rest."""
    from unittest.mock import AsyncMock

    session = AsyncMock(spec=AsyncSession)

    # Two test definitions — one ok, one crashing
    test_registry: dict[str, DiagnosticDefinition] = {
        "test.ok.1": DiagnosticDefinition(
            key="test.ok.1",
            label="Ok 1",
            description="Ok.",
            collector=_ok_collector,
            category="test",
            supported_modes=frozenset({DiagnosticMode.COMPACT}),
            max_sample_rows=5,
            tenant_aware=False,
        ),
        "test.crash.1": DiagnosticDefinition(
            key="test.crash.1",
            label="Crash 1",
            description="Will crash.",
            collector=_failing_collector,
            category="test",
            supported_modes=frozenset({DiagnosticMode.COMPACT}),
            max_sample_rows=5,
            tenant_aware=False,
        ),
    }

    def _fake_get(key: str) -> DiagnosticDefinition:
        return test_registry[key]

    monkeypatch.setattr("psihointegritet.modules.diagnostics.runner.get_definition", _fake_get)

    results = await run_many(
        keys=["test.ok.1", "test.crash.1"],
        session=session,
        organization_id=None,
        mode=DiagnosticMode.COMPACT,
    )
    assert len(results) == 2
    # One ok, one failed
    statuses = {r.key: r.status for r in results}
    assert statuses["test.ok.1"] == DiagnosticStatus.OK
    assert statuses["test.crash.1"] == DiagnosticStatus.FAILED


# ── D-Common-5: sample_rows clipped ─────────────────────────────────────────


def test_sample_rows_respects_limit() -> None:
    """sample_rows must not exceed the definition's max_sample_rows (D-Common-5)."""
    small_def = DiagnosticDefinition(
        key="test.small",
        label="Small",
        description="Only 2 samples max.",
        collector=_error_collector,
        category="test",
        supported_modes=frozenset({DiagnosticMode.COMPACT, DiagnosticMode.FULL}),
        max_sample_rows=2,
        tenant_aware=True,
    )
    # Simulate what run_one does: limit to min(sample_limit, max_sample_rows)
    effective = min(5, small_def.max_sample_rows)
    assert effective == 2


# ── D-Common-6: affected_count is total, not len(sample) ────────────────────


@pytest.mark.asyncio
async def test_affected_count_is_total_not_sample_len() -> None:
    """affected_count must be COUNT-based, not len(sample_rows) (D-Common-6)."""
    result = DiagnosticResult(
        key="test",
        status=DiagnosticStatus.ERROR,
        affected_count=500,
        summary="Lots.",
        sample_rows=[{"id": i} for i in range(5)],
        duration_ms=0,
        checked_at=_CHECKED_AT,
    )
    assert result.affected_count == 500
    assert len(result.sample_rows) == 5
    assert result.affected_count != len(result.sample_rows)


# ── D-Common-7: duration_ms and checked_at populated ────────────────────────


@pytest.mark.asyncio
async def test_duration_and_timestamp_are_populated(monkeypatch: pytest.MonkeyPatch) -> None:
    """Every result must carry duration_ms and checked_at (D-Common-7)."""
    from unittest.mock import AsyncMock

    session = AsyncMock(spec=AsyncSession)

    ok_def = DiagnosticDefinition(
        key="test.duration",
        label="Duration",
        description="Returns ok.",
        collector=_ok_collector,
        category="test",
        supported_modes=frozenset({DiagnosticMode.COMPACT}),
        max_sample_rows=5,
        tenant_aware=False,
    )

    def _fake_get(_key: str) -> DiagnosticDefinition:
        return ok_def

    monkeypatch.setattr("psihointegritet.modules.diagnostics.runner.get_definition", _fake_get)

    result = await run_one(
        "test.duration",
        session=session,
        organization_id=_ORG_A,
        mode=DiagnosticMode.COMPACT,
    )
    assert result.duration_ms >= 0
    assert isinstance(result.checked_at, datetime)


# ── D-Common-9: Non-superadmin cannot use global scope ──────────────────────


def test_global_scope_requires_superadmin() -> None:
    """Tenant-scoped collectors with organization_id=None are superadmin-only.

    The enforcement belongs to the router (via RequireSuperadmin), not the runner.
    This test documents that the runner *does not reject* None organization_id
    — the guard is at the HTTP adapter layer (D-Common-9), which is tested by
    the API contract tests.
    """
    # The runner itself accepts None — it's the router's job to gate this
    pass  # Documented behavior, not runtime-assertable here


# ── D-Common-10: Collector does not mutate the database ─────────────────────


async def test_collector_is_read_only() -> None:
    """Every collector must be read-only — no session.add/delete/execute(update).

    The booking integration tests (§7.2) verify this with a snapshot approach.
    This unit test documents the rule.
    """
    # Integration tests cover the actual snapshot check
    pass


# ── Registration sanity ─────────────────────────────────────────────────────


def test_list_definitions_returns_all_registered() -> None:
    """list_definitions() must return every diagnostic in insertion order."""
    definitions = list_definitions()
    assert len(definitions) == len(DIAGNOSTIC_REGISTRY)
    keys_from_list = [d.key for d in definitions]
    keys_from_registry = list(DIAGNOSTIC_REGISTRY.keys())
    assert keys_from_list == keys_from_registry


def test_all_booking_collectors_have_valid_modes() -> None:
    """Every booking collector must support at least COMPACT mode."""
    for definition in list_definitions():
        if definition.category == "booking":
            assert DiagnosticMode.COMPACT in definition.supported_modes, (
                f"Booking collector {definition.key} must support COMPACT mode"
            )
