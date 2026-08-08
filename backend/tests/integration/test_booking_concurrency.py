"""True-concurrency integration tests for the Booking Integrity Gate.

`db_session` (see conftest.py) joins every call in a test to ONE shared
transaction/savepoint — exactly wrong here, since two callers racing for the
same slot need to be on two independent connections with their own real
commits, or there is nothing to race. Every test in this file builds its own
engine/session pair and cleans up by deleting the seeded organization (FKs
cascade), since nothing here can rely on an outer rollback for isolation.

Requires real PostgreSQL — `appointments_no_therapist_overlap` is a
btree_gist EXCLUDE constraint (0009 migration) with no SQLite equivalent, and
the whole point of this file is testing what only PostgreSQL enforces.
"""

import asyncio
from collections.abc import AsyncIterator
from datetime import UTC, datetime, timedelta
from uuid import UUID, uuid4

import pytest
from sqlalchemy import delete, select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from psihointegritet.core.config import get_settings
from psihointegritet.modules.booking.models import Appointment, ServiceBookingConfig
from psihointegritet.modules.booking.schemas import (
    AppointmentRequestIn,
    ReviewAction,
    ServiceBookingConfigIn,
)
from psihointegritet.modules.booking.service import BookingService, BookingSlotConflictError
from psihointegritet.modules.content.models import ContentEntry, ContentType
from psihointegritet.modules.guidance.models import TherapistMatchingProfile
from psihointegritet.modules.identity.models import InternalUser
from psihointegritet.modules.organizations.models import Organization
from tests.integration.conftest import test_database_url as _test_database_url

# ── Fixtures ─────────────────────────────────────────────────────────────────


@pytest.fixture
async def engine() -> AsyncIterator[AsyncEngine]:
    eng = create_async_engine(_test_database_url())
    try:
        async with eng.connect():
            pass
    except (SQLAlchemyError, OSError) as error:
        await eng.dispose()
        pytest.skip(f"No test database reachable ({type(error).__name__}). Start compose.")
    yield eng
    await eng.dispose()


@pytest.fixture
def session_factory(engine: AsyncEngine) -> async_sessionmaker[AsyncSession]:
    return async_sessionmaker(engine, expire_on_commit=False)


# ── Helpers ──────────────────────────────────────────────────────────────────


def _svc(session: AsyncSession) -> BookingService:
    return BookingService(session, get_settings())


class _Fixture:
    """A committed org/therapist/service/reviewer, ready for two independent
    sessions to race over."""

    def __init__(self, org_id: UUID, therapist_id: UUID, service_id: UUID, user_id: UUID) -> None:
        self.org_id = org_id
        self.therapist_id = therapist_id
        self.service_id = service_id
        self.user_id = user_id


async def _seed_committed(
    session_factory: async_sessionmaker[AsyncSession], suffix: str
) -> _Fixture:
    async with session_factory() as session:
        org = Organization(slug=f"race-{suffix}", display_name=f"Race test {suffix}")
        session.add(org)
        await session.flush()
        therapist = TherapistMatchingProfile(
            organization_id=org.id,
            slug=f"race-therapist-{suffix}",
            display_name=f"Race Therapist {suffix}",
            services=[],
            areas=[],
            formats=[],
            locations=[],
            min_child_age=0,
        )
        entry = ContentEntry(
            organization_id=org.id,
            content_type=ContentType.SERVICE,
            slug=f"race-service-{suffix}",
            locale="sr-Latn",
        )
        user = InternalUser(external_auth_id=f"race-user-{suffix}")
        session.add_all([therapist, entry, user])
        await session.flush()
        fixture = _Fixture(org.id, therapist.id, entry.id, user.id)
        await session.commit()
        return fixture


async def _cleanup(session_factory: async_sessionmaker[AsyncSession], org_id: UUID) -> None:
    async with session_factory() as session:
        await session.execute(delete(Organization).where(Organization.id == org_id))
        await session.commit()


async def _seed_request(
    session_factory: async_sessionmaker[AsyncSession],
    fx: _Fixture,
    start: datetime,
    end: datetime,
    idem_key: str,
) -> UUID:
    async with session_factory() as session:
        req = await _svc(session).create_appointment_request(
            fx.org_id,
            AppointmentRequestIn(
                therapist_profile_id=fx.therapist_id,
                service_id=fx.service_id,
                request_type="initial",
                preferred_start=start,
                preferred_end=end,
                format="online",
                client_name="Race Client",
                client_email="race@example.com",
                client_timezone="Europe/Belgrade",
                idempotency_key=idem_key,
                consent_booking_rules=True,
            ),
        )
        await session.commit()
        return req.id


async def _confirm(
    session_factory: async_sessionmaker[AsyncSession],
    org_id: UUID,
    request_id: UUID,
    reviewer_id: UUID,
) -> tuple[dict[str, str] | None, Exception | None]:
    """Run one confirm attempt to completion on its own session, mirroring
    exactly what the router does: commit on success, otherwise let the
    exception propagate and leave the transaction to be discarded."""
    async with session_factory() as session:
        try:
            result = await _svc(session).review_request(
                org_id, request_id, ReviewAction(action="confirm"), reviewer_id
            )
        except Exception as error:
            return None, error
        await session.commit()
        return result, None


def _future_slot(hours_from_now: int) -> tuple[datetime, datetime]:
    start = datetime.now(UTC).replace(minute=0, second=0, microsecond=0) + timedelta(
        hours=hours_from_now
    )
    return start, start + timedelta(hours=1)


# ── Appointment overlap race ─────────────────────────────────────────────────


class TestAppointmentOverlapRace:
    async def test_overlapping_confirms_only_one_wins(
        self, session_factory: async_sessionmaker[AsyncSession]
    ) -> None:
        suffix = uuid4().hex[:10]
        fx = await _seed_committed(session_factory, suffix)
        try:
            start, end = _future_slot(240)
            req_a = await _seed_request(session_factory, fx, start, end, f"race-a-{suffix}")
            req_b = await _seed_request(
                session_factory,
                fx,
                start + timedelta(minutes=30),
                end + timedelta(minutes=30),
                f"race-b-{suffix}",
            )

            outcome_a, outcome_b = await asyncio.gather(
                _confirm(session_factory, fx.org_id, req_a, fx.user_id),
                _confirm(session_factory, fx.org_id, req_b, fx.user_id),
            )

            outcomes = [outcome_a, outcome_b]
            wins = [o for o in outcomes if o[0] is not None]
            losses = [o for o in outcomes if o[1] is not None]
            assert len(wins) == 1, f"expected exactly one winner, got {outcomes}"
            assert len(losses) == 1
            assert isinstance(losses[0][1], BookingSlotConflictError)

            async with session_factory() as session:
                result = await session.execute(
                    select(Appointment).where(Appointment.therapist_profile_id == fx.therapist_id)
                )
                assert len(result.scalars().all()) == 1
        finally:
            await _cleanup(session_factory, fx.org_id)

    async def test_double_confirm_same_request_only_one_appointment(
        self, session_factory: async_sessionmaker[AsyncSession]
    ) -> None:
        """Two concurrent reviewers confirming the SAME request: the
        SELECT ... FOR UPDATE lock (not the exclusion constraint) is what
        stops the second one — it sees the request already CONVERTED and
        fails the status-transition check instead."""
        suffix = uuid4().hex[:10]
        fx = await _seed_committed(session_factory, suffix)
        try:
            start, end = _future_slot(241)
            req_id = await _seed_request(session_factory, fx, start, end, f"double-{suffix}")

            outcome_a, outcome_b = await asyncio.gather(
                _confirm(session_factory, fx.org_id, req_id, fx.user_id),
                _confirm(session_factory, fx.org_id, req_id, fx.user_id),
            )

            outcomes = [outcome_a, outcome_b]
            wins = [o for o in outcomes if o[0] is not None]
            losses = [o for o in outcomes if o[1] is not None]
            assert len(wins) == 1, f"expected exactly one winner, got {outcomes}"
            assert len(losses) == 1
            assert isinstance(losses[0][1], ValueError)
            assert not isinstance(losses[0][1], BookingSlotConflictError)

            async with session_factory() as session:
                result = await session.execute(
                    select(Appointment).where(Appointment.therapist_profile_id == fx.therapist_id)
                )
                assert len(result.scalars().all()) == 1
        finally:
            await _cleanup(session_factory, fx.org_id)

    async def test_different_organizations_do_not_conflict(
        self, session_factory: async_sessionmaker[AsyncSession]
    ) -> None:
        """The exclusion constraint scopes on (organization_id,
        therapist_profile_id): two tenants booking the exact same wall-clock
        time never contend for the same lock, even by coincidence."""
        suffix = uuid4().hex[:10]
        fx_a = await _seed_committed(session_factory, f"{suffix}a")
        fx_b = await _seed_committed(session_factory, f"{suffix}b")
        try:
            start, end = _future_slot(242)
            req_a = await _seed_request(session_factory, fx_a, start, end, f"tenant-a-{suffix}")
            req_b = await _seed_request(session_factory, fx_b, start, end, f"tenant-b-{suffix}")

            result_a, error_a = await _confirm(session_factory, fx_a.org_id, req_a, fx_a.user_id)
            result_b, error_b = await _confirm(session_factory, fx_b.org_id, req_b, fx_b.user_id)

            assert error_a is None
            assert error_b is None
            assert result_a is not None
            assert result_b is not None
        finally:
            await _cleanup(session_factory, fx_a.org_id)
            await _cleanup(session_factory, fx_b.org_id)


# ── Booking config upsert race ───────────────────────────────────────────────


class TestBookingConfigUpsertRace:
    async def test_parallel_upsert_without_location_creates_exactly_one_row(
        self, session_factory: async_sessionmaker[AsyncSession]
    ) -> None:
        """Two concurrent upserts for the same no-location offer must not
        race past `uq_booking_config_offer` (NULLS NOT DISTINCT, 0008
        migration) — INSERT ... ON CONFLICT DO UPDATE is atomic at the DB
        level regardless of which of the two statements arrives first."""
        suffix = uuid4().hex[:10]
        fx = await _seed_committed(session_factory, suffix)
        try:

            async def _upsert(mode: str, minutes: int) -> None:
                async with session_factory() as session:
                    await _svc(session).upsert_booking_config(
                        fx.org_id,
                        ServiceBookingConfigIn(
                            service_id=fx.service_id,
                            therapist_profile_id=fx.therapist_id,
                            format="online",
                            booking_mode=mode,
                            duration_minutes=minutes,
                        ),
                    )
                    await session.commit()

            await asyncio.gather(
                _upsert("slot_request", 45),
                _upsert("request", 60),
            )

            async with session_factory() as session:
                result = await session.execute(
                    select(ServiceBookingConfig).where(
                        ServiceBookingConfig.organization_id == fx.org_id,
                        ServiceBookingConfig.service_id == fx.service_id,
                        ServiceBookingConfig.therapist_profile_id == fx.therapist_id,
                    )
                )
                assert len(result.scalars().all()) == 1
        finally:
            await _cleanup(session_factory, fx.org_id)
