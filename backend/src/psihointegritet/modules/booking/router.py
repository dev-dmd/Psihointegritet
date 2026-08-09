"""Booking Engine — FastAPI router.

Public endpoints for clients and staff endpoints for therapists/admins.
No SQL, no business logic — delegates to BookingService.
"""

from datetime import date
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, HTTPException, Query, status

from psihointegritet.api.dependencies import AppSettings, DatabaseSession, RequireStaff
from psihointegritet.core.config import Settings
from psihointegritet.core.logging import get_logger
from psihointegritet.modules.booking.schemas import (
    AcceptAlternativeRequest,
    AppointmentOut,
    AppointmentRequestIn,
    AppointmentRequestOut,
    AvailabilityExceptionIn,
    AvailabilityExceptionOut,
    AvailabilityProfileIn,
    AvailabilityProfileOut,
    AvailabilityRuleIn,
    AvailabilityRuleOut,
    CancelAppointmentRequest,
    DerivedSlotOut,
    ManualAvailabilitySlotIn,
    ManualAvailabilitySlotOut,
    MyTherapistProfileOut,
    ReviewAction,
    ServiceBookingConfigIn,
    ServiceBookingConfigOut,
    SlotHoldOut,
    SlotHoldRequest,
    SlotQueryParams,
)
from psihointegritet.modules.booking.service import (
    BookingConflictError,
    BookingService,
    BookingValidationError,
)

logger = get_logger(__name__)

# ── Routers ──────────────────────────────────────────────────────────────────

public_router = APIRouter(prefix="/booking", tags=["booking"])
staff_router = APIRouter(prefix="/booking", tags=["booking-staff"])


def _conflict_problem(error: BookingConflictError) -> HTTPException:
    """`error.code` distinguishes a generic booking conflict from
    BOOKING_SLOT_CONFLICT (DB exclusion-constraint rejection) for clients."""
    return HTTPException(
        status_code=status.HTTP_409_CONFLICT,
        detail={"code": error.code, "message": str(error)},
    )


# ── Public: Slots ────────────────────────────────────────────────────────────


@public_router.get("/slots", response_model=list[DerivedSlotOut])
async def get_available_slots(
    params: Annotated[SlotQueryParams, Query()],
    session: DatabaseSession,
    settings: AppSettings,
) -> list[DerivedSlotOut]:
    """Public: list available slots for a service/therapist/format combo."""
    svc = BookingService(session, settings)
    org_id = await _resolve_org_id(session, settings)
    return await svc.get_available_slots(org_id, params)


# ── Public: Slot Hold ────────────────────────────────────────────────────────


@public_router.post(
    "/slots/hold",
    response_model=SlotHoldOut,
    status_code=status.HTTP_201_CREATED,
)
async def hold_slot(
    data: SlotHoldRequest,
    session: DatabaseSession,
    settings: AppSettings,
) -> SlotHoldOut:
    """Public: atomically hold a slot during form submission."""
    svc = BookingService(session, settings)
    org_id = await _resolve_org_id(session, settings)
    try:
        result = await svc.create_slot_hold(org_id, data)
        await session.commit()
        return result
    except BookingConflictError as e:
        raise _conflict_problem(e) from e


@public_router.delete("/slots/hold/{hold_id}", status_code=status.HTTP_204_NO_CONTENT)
async def release_slot_hold(
    hold_id: UUID,
    session: DatabaseSession,
    settings: AppSettings,
) -> None:
    """Public: release a slot hold after submission or timeout."""
    svc = BookingService(session, settings)
    org_id = await _resolve_org_id(session, settings)
    await svc.release_slot_hold(hold_id, org_id)
    await session.commit()


# ── Public: Appointment Requests ─────────────────────────────────────────────


@public_router.post(
    "/appointment-requests",
    response_model=AppointmentRequestOut,
    status_code=status.HTTP_201_CREATED,
)
async def create_appointment_request(
    data: AppointmentRequestIn,
    session: DatabaseSession,
    settings: AppSettings,
) -> AppointmentRequestOut:
    """Public: submit a booking or reschedule request."""
    svc = BookingService(session, settings)
    org_id = await _resolve_org_id(session, settings)
    try:
        result = await svc.create_appointment_request(org_id, data)
        await session.commit()
        return result
    except BookingConflictError as e:
        raise _conflict_problem(e) from e
    except BookingValidationError as e:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(e)) from e


@public_router.get(
    "/appointment-requests/client/{email}",
    response_model=list[AppointmentRequestOut],
)
async def list_client_requests(
    email: str,
    session: DatabaseSession,
    settings: AppSettings,
) -> list[AppointmentRequestOut]:
    """Public: list requests for a client by email."""
    svc = BookingService(session, settings)
    org_id = await _resolve_org_id(session, settings)
    return await svc.list_client_appointment_requests(org_id, email)


@public_router.post("/appointment-requests/{request_id}/accept-alternative")
async def accept_alternative(
    request_id: UUID,
    data: AcceptAlternativeRequest,
    session: DatabaseSession,
    settings: AppSettings,
) -> dict[str, str]:
    """Public: client accepts one of the proposed alternatives."""
    svc = BookingService(session, settings)
    org_id = await _resolve_org_id(session, settings)
    try:
        result = await svc.accept_alternative(org_id, request_id, data)
        await session.commit()
        return result
    except BookingConflictError as e:
        raise _conflict_problem(e) from e
    except BookingValidationError as e:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(e)) from e


# ── Staff: Booking Config ────────────────────────────────────────────────────


@staff_router.post(
    "/configs",
    response_model=ServiceBookingConfigOut,
    status_code=status.HTTP_201_CREATED,
)
async def upsert_booking_config(
    data: ServiceBookingConfigIn,
    actor: RequireStaff,
    session: DatabaseSession,
    settings: AppSettings,
) -> ServiceBookingConfigOut:
    """Staff: create or update a booking config for a concrete offer."""
    svc = BookingService(session, settings)
    org_id = await _resolve_org_id(session, settings)
    result = await svc.upsert_booking_config(org_id, data)
    await session.commit()
    return result


@staff_router.get("/availability/me", response_model=MyTherapistProfileOut)
async def get_my_therapist_profile(
    actor: RequireStaff,
    session: DatabaseSession,
    settings: AppSettings,
) -> MyTherapistProfileOut:
    """Staff: which therapist the signed-in account is, for the availability screens."""
    svc = BookingService(session, settings)
    org_id = await _resolve_org_id(session, settings)
    profile = await svc.get_therapist_profile_for_user(org_id, actor.user_id)
    if profile is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "code": "NO_THERAPIST_PROFILE",
                "message": "Ovaj nalog nije povezan ni sa jednim terapeutskim profilom.",
            },
        )
    return profile


# ── Staff: Availability ──────────────────────────────────────────────────────


@staff_router.post(
    "/availability/rules",
    response_model=AvailabilityRuleOut,
    status_code=status.HTTP_201_CREATED,
)
async def create_availability_rule(
    data: AvailabilityRuleIn,
    actor: RequireStaff,
    session: DatabaseSession,
    settings: AppSettings,
) -> AvailabilityRuleOut:
    """Staff: create a recurring availability rule for a therapist."""
    svc = BookingService(session, settings)
    org_id = await _resolve_org_id(session, settings)
    result = await svc.create_availability_rule(org_id, data)
    await session.commit()
    return result


@staff_router.get(
    "/availability/rules/{availability_profile_id}",
    response_model=list[AvailabilityRuleOut],
)
async def list_availability_rules(
    availability_profile_id: UUID,
    actor: RequireStaff,
    session: DatabaseSession,
    settings: AppSettings,
) -> list[AvailabilityRuleOut]:
    """Staff: list active availability rules for a profile."""
    svc = BookingService(session, settings)
    org_id = await _resolve_org_id(session, settings)
    return await svc.list_availability_rules(org_id, availability_profile_id)


# ── Staff: Availability Profiles (ADR-015 v2) ───────────────────────────────


@staff_router.post(
    "/availability/profiles",
    response_model=AvailabilityProfileOut,
    status_code=status.HTTP_201_CREATED,
)
async def create_availability_profile(
    data: AvailabilityProfileIn,
    actor: RequireStaff,
    session: DatabaseSession,
    settings: AppSettings,
) -> AvailabilityProfileOut:
    """Staff: create an availability profile for a therapist (KAKO)."""
    svc = BookingService(session, settings)
    org_id = await _resolve_org_id(session, settings)
    try:
        result = await svc.create_availability_profile(org_id, data)
        await session.commit()
        return result
    except BookingConflictError as e:
        raise _conflict_problem(e) from e


@staff_router.get(
    "/availability/profiles/{therapist_profile_id}",
    response_model=list[AvailabilityProfileOut],
)
async def list_availability_profiles(
    therapist_profile_id: UUID,
    actor: RequireStaff,
    session: DatabaseSession,
    settings: AppSettings,
) -> list[AvailabilityProfileOut]:
    """Staff: list availability profiles for a therapist."""
    svc = BookingService(session, settings)
    org_id = await _resolve_org_id(session, settings)
    return await svc.list_availability_profiles(org_id, therapist_profile_id)


@staff_router.put(
    "/availability/profiles/{profile_id}",
    response_model=AvailabilityProfileOut,
)
async def update_availability_profile(
    profile_id: UUID,
    data: AvailabilityProfileIn,
    actor: RequireStaff,
    session: DatabaseSession,
    settings: AppSettings,
) -> AvailabilityProfileOut:
    """Staff: update an availability profile."""
    svc = BookingService(session, settings)
    org_id = await _resolve_org_id(session, settings)
    result = await svc.update_availability_profile(org_id, profile_id, data)
    await session.commit()
    return result


@staff_router.delete(
    "/availability/profiles/{profile_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_availability_profile(
    profile_id: UUID,
    actor: RequireStaff,
    session: DatabaseSession,
    settings: AppSettings,
) -> None:
    """Staff: delete an availability profile."""
    svc = BookingService(session, settings)
    org_id = await _resolve_org_id(session, settings)
    await svc.delete_availability_profile(org_id, profile_id)
    await session.commit()


# ── Staff: Manual Availability Slots (ADR-015 v2) ───────────────────────────


@staff_router.post(
    "/availability/manual-slots",
    response_model=ManualAvailabilitySlotOut,
    status_code=status.HTTP_201_CREATED,
)
async def create_manual_availability_slot(
    data: ManualAvailabilitySlotIn,
    actor: RequireStaff,
    session: DatabaseSession,
    settings: AppSettings,
) -> ManualAvailabilitySlotOut:
    """Staff: add an explicit manual slot (manual_slots mode)."""
    svc = BookingService(session, settings)
    org_id = await _resolve_org_id(session, settings)
    result = await svc.create_manual_availability_slot(org_id, data)
    await session.commit()
    return result


@staff_router.delete(
    "/availability/manual-slots/{slot_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_manual_availability_slot(
    slot_id: UUID,
    actor: RequireStaff,
    session: DatabaseSession,
    settings: AppSettings,
) -> None:
    """Staff: remove a manual availability slot."""
    svc = BookingService(session, settings)
    org_id = await _resolve_org_id(session, settings)
    await svc.delete_manual_availability_slot(org_id, slot_id)
    await session.commit()


@staff_router.get(
    "/availability/manual-slots/{availability_profile_id}",
    response_model=list[ManualAvailabilitySlotOut],
)
async def list_manual_availability_slots(
    availability_profile_id: UUID,
    actor: RequireStaff,
    session: DatabaseSession,
    settings: AppSettings,
    date_from: Annotated[date, Query()],
    date_until: Annotated[date, Query()],
) -> list[ManualAvailabilitySlotOut]:
    """Staff: list manual slots for a profile in a date range."""
    svc = BookingService(session, settings)
    org_id = await _resolve_org_id(session, settings)
    return await svc.list_manual_availability_slots(
        org_id, availability_profile_id, date_from, date_until
    )


@staff_router.post(
    "/availability/profiles/{availability_profile_id}/generate-week",
    response_model=list[ManualAvailabilitySlotOut],
    status_code=status.HTTP_201_CREATED,
)
async def generate_week(
    availability_profile_id: UUID,
    week_start: Annotated[date, Query()],
    actor: RequireStaff,
    session: DatabaseSession,
    settings: AppSettings,
) -> list[ManualAvailabilitySlotOut]:
    """Staff: materialize one week of recurring rules into manual slots."""
    svc = BookingService(session, settings)
    org_id = await _resolve_org_id(session, settings)
    result = await svc.generate_week(org_id, availability_profile_id, week_start)
    await session.commit()
    return result


@staff_router.post(
    "/availability/profiles/{availability_profile_id}/copy-week",
    response_model=list[ManualAvailabilitySlotOut],
    status_code=status.HTTP_201_CREATED,
)
async def copy_week(
    availability_profile_id: UUID,
    source_week_start: Annotated[date, Query()],
    target_week_start: Annotated[date, Query()],
    actor: RequireStaff,
    session: DatabaseSession,
    settings: AppSettings,
) -> list[ManualAvailabilitySlotOut]:
    """Staff: copy a week of manual slots into another week."""
    svc = BookingService(session, settings)
    org_id = await _resolve_org_id(session, settings)
    result = await svc.copy_week(
        org_id, availability_profile_id, source_week_start, target_week_start
    )
    await session.commit()
    return result


@staff_router.put(
    "/availability/rules/{rule_id}",
    response_model=AvailabilityRuleOut,
)
async def update_availability_rule(
    rule_id: UUID,
    data: AvailabilityRuleIn,
    actor: RequireStaff,
    session: DatabaseSession,
    settings: AppSettings,
) -> AvailabilityRuleOut:
    """Staff: update a recurring availability rule."""
    svc = BookingService(session, settings)
    org_id = await _resolve_org_id(session, settings)
    result = await svc.update_availability_rule(org_id, rule_id, data)
    await session.commit()
    return result


@staff_router.delete(
    "/availability/rules/{rule_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_availability_rule(
    rule_id: UUID,
    actor: RequireStaff,
    session: DatabaseSession,
    settings: AppSettings,
) -> None:
    """Staff: soft-delete a recurring availability rule."""
    svc = BookingService(session, settings)
    org_id = await _resolve_org_id(session, settings)
    await svc.delete_availability_rule(org_id, rule_id)
    await session.commit()


@staff_router.post(
    "/availability/exceptions",
    response_model=AvailabilityExceptionOut,
    status_code=status.HTTP_201_CREATED,
)
async def create_availability_exception(
    data: AvailabilityExceptionIn,
    actor: RequireStaff,
    session: DatabaseSession,
    settings: AppSettings,
) -> AvailabilityExceptionOut:
    """Staff: create a one-off availability exception."""
    svc = BookingService(session, settings)
    org_id = await _resolve_org_id(session, settings)
    try:
        result = await svc.create_availability_exception(org_id, data)
        await session.commit()
        return result
    except BookingConflictError as e:
        raise _conflict_problem(e) from e


@staff_router.delete(
    "/availability/exceptions/{exception_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_availability_exception(
    exception_id: UUID,
    actor: RequireStaff,
    session: DatabaseSession,
    settings: AppSettings,
) -> None:
    """Staff: delete a one-off availability exception."""
    svc = BookingService(session, settings)
    org_id = await _resolve_org_id(session, settings)
    await svc.delete_availability_exception(org_id, exception_id)
    await session.commit()


@staff_router.get(
    "/availability/exceptions/{therapist_profile_id}",
    response_model=list[AvailabilityExceptionOut],
)
async def list_availability_exceptions(
    therapist_profile_id: UUID,
    actor: RequireStaff,
    session: DatabaseSession,
    settings: AppSettings,
    date_from: Annotated[date, Query()],
    date_until: Annotated[date, Query()],
) -> list[AvailabilityExceptionOut]:
    """Staff: list exceptions for a therapist in a date range."""
    svc = BookingService(session, settings)
    org_id = await _resolve_org_id(session, settings)
    return await svc.list_availability_exceptions(
        org_id, therapist_profile_id, date_from, date_until
    )


# ── Staff: Appointment Request Review ────────────────────────────────────────


@staff_router.get(
    "/appointment-requests",
    response_model=list[AppointmentRequestOut],
)
async def list_appointment_requests(
    actor: RequireStaff,
    session: DatabaseSession,
    settings: AppSettings,
    therapist_profile_id: Annotated[UUID | None, Query()] = None,
    status_filter: Annotated[str | None, Query(alias="status")] = None,
) -> list[AppointmentRequestOut]:
    """Staff: list appointment requests for review."""
    svc = BookingService(session, settings)
    org_id = await _resolve_org_id(session, settings)
    return await svc.list_appointment_requests(org_id, therapist_profile_id, status_filter)


@staff_router.post("/appointment-requests/{request_id}/review")
async def review_appointment_request(
    request_id: UUID,
    action: ReviewAction,
    actor: RequireStaff,
    session: DatabaseSession,
    settings: AppSettings,
) -> dict[str, str]:
    """Staff: review a pending appointment request (confirm/decline/propose)."""
    svc = BookingService(session, settings)
    org_id = await _resolve_org_id(session, settings)
    try:
        result = await svc.review_request(org_id, request_id, action, actor.user_id)
        await session.commit()
        return result
    except BookingConflictError as e:
        raise _conflict_problem(e) from e
    except (BookingValidationError, ValueError) as e:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(e)) from e


# ── Staff: Appointment Management ────────────────────────────────────────────


@staff_router.get("/appointments", response_model=list[AppointmentOut])
async def list_appointments(
    actor: RequireStaff,
    session: DatabaseSession,
    settings: AppSettings,
    therapist_profile_id: Annotated[UUID | None, Query()] = None,
    status_filter: Annotated[str | None, Query(alias="status")] = None,
    date_from: Annotated[str | None, Query()] = None,
    date_until: Annotated[str | None, Query()] = None,
) -> list[AppointmentOut]:
    """Staff: list confirmed appointments."""
    svc = BookingService(session, settings)
    org_id = await _resolve_org_id(session, settings)
    from datetime import datetime as dt

    return await svc.list_appointments(
        org_id,
        therapist_profile_id,
        status_filter,
        dt.fromisoformat(date_from) if date_from else None,
        dt.fromisoformat(date_until) if date_until else None,
    )


@staff_router.post(
    "/appointments/{appointment_id}/cancel",
    response_model=AppointmentOut,
)
async def cancel_appointment(
    appointment_id: UUID,
    data: CancelAppointmentRequest,
    actor: RequireStaff,
    session: DatabaseSession,
    settings: AppSettings,
) -> AppointmentOut:
    """Staff: cancel a confirmed appointment."""
    svc = BookingService(session, settings)
    org_id = await _resolve_org_id(session, settings)
    try:
        result = await svc.cancel_appointment(org_id, appointment_id, data)
        await session.commit()
        return result
    except BookingValidationError as e:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(e)) from e


@staff_router.post(
    "/appointments/{appointment_id}/complete",
    response_model=AppointmentOut,
)
async def complete_appointment(
    appointment_id: UUID,
    actor: RequireStaff,
    session: DatabaseSession,
    settings: AppSettings,
) -> AppointmentOut:
    """Staff: mark an appointment as completed."""
    svc = BookingService(session, settings)
    org_id = await _resolve_org_id(session, settings)
    result = await svc.complete_appointment(org_id, appointment_id)
    await session.commit()
    return result


@staff_router.post(
    "/appointments/{appointment_id}/no-show",
    response_model=AppointmentOut,
)
async def mark_no_show(
    appointment_id: UUID,
    actor: RequireStaff,
    session: DatabaseSession,
    settings: AppSettings,
) -> AppointmentOut:
    """Staff: mark an appointment as no-show."""
    svc = BookingService(session, settings)
    org_id = await _resolve_org_id(session, settings)
    result = await svc.mark_no_show(org_id, appointment_id)
    await session.commit()
    return result


# ── Helpers ──────────────────────────────────────────────────────────────────


async def _resolve_org_id(session: DatabaseSession, settings: Settings) -> UUID:
    """Resolve the organization ID from the default slug."""
    from sqlalchemy import select as sa_select

    from psihointegritet.modules.organizations.models import Organization

    result = await session.execute(
        sa_select(Organization.id).where(Organization.slug == settings.default_organization_slug)
    )
    org_id = result.scalar_one_or_none()
    if org_id is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Default organization not found",
        )
    return org_id
