"""Diagnostic Engine — explicit registry (DIAGNOSTIC_TODO.md §2).

Every diagnostic must be added here *by hand*. Dynamic scanning, plugin import
or discovery through module inspection is prohibited. The registry is a single
literal dict so that every key is visible in one place without running code.
"""

from collections.abc import Mapping

from psihointegritet.modules.diagnostics.collectors import booking as booking_collectors
from psihointegritet.modules.diagnostics.contracts import DiagnosticDefinition


class DiagnosticKeyUnknownError(RuntimeError):
    """A key requested by the API is not in the registry."""

    def __init__(self, key: str) -> None:
        self.key = key
        super().__init__(f"Diagnostic key not registered: {key}")


DIAGNOSTIC_REGISTRY: Mapping[str, DiagnosticDefinition] = {
    # ── Booking integrity ────────────────────────────────────────────────
    booking_collectors.APPOINTMENT_OVERLAPS.key: (booking_collectors.APPOINTMENT_OVERLAPS),
    booking_collectors.DUPLICATE_CONFIG_SCOPE.key: (booking_collectors.DUPLICATE_CONFIG_SCOPE),
    booking_collectors.REQUEST_APPOINTMENT_MISMATCH.key: (
        booking_collectors.REQUEST_APPOINTMENT_MISMATCH
    ),
    booking_collectors.STUCK_SLOT_HOLDS.key: (booking_collectors.STUCK_SLOT_HOLDS),
}


def get_definition(key: str) -> DiagnosticDefinition:
    """Look up a single diagnostic by key.

    Raises:
        DiagnosticKeyUnknownError: when *key* is not registered (D-Common-2).
    """
    definition = DIAGNOSTIC_REGISTRY.get(key)
    if definition is None:
        raise DiagnosticKeyUnknownError(key)
    return definition


def list_definitions() -> list[DiagnosticDefinition]:
    """Return every registered diagnostic in insertion order.

    Used by ``GET /superadmin/diagnostics`` (D6.1).
    """
    return list(DIAGNOSTIC_REGISTRY.values())
