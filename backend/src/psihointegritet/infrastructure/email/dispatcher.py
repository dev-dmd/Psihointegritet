"""Outbox dispatcher — reads pending notifications and sends them via Resend.

Called by a scheduled job (QStash / cron / CLI).  Each successful send marks
the outbox record as sent; each failure bumps the attempt counter and sets
a back-off ``available_at`` so the record isn't retried immediately.
"""

from __future__ import annotations

import os
from datetime import UTC, datetime, timedelta
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from psihointegritet.infrastructure.email.resend_client import (
    EmailEnvelope,
    ResendClient,
)
from psihointegritet.infrastructure.email.templates import (
    changes_requested_email,
    review_approved_email,
    review_requested_email,
)
from psihointegritet.modules.content.models import (
    ContentEntry,
    ContentRevision,
    NotificationOutbox,
)
from psihointegritet.modules.identity.models import InternalUser

MAX_ATTEMPTS = 5
BATCH_SIZE = 20
RETRY_DELAY_MINUTES = [1, 5, 15, 60, 240]  # exponential-ish backoff


async def dispatch_pending(client: ResendClient, session: AsyncSession) -> int:
    """Process up to ``BATCH_SIZE`` pending outbox records.

    Returns the number of successfully dispatched emails.
    """
    now = datetime.now(UTC)

    # Fetch pending records
    rows = (
        await session.scalars(
            select(NotificationOutbox)
            .where(
                NotificationOutbox.sent_at.is_(None),
                NotificationOutbox.available_at <= now,
                NotificationOutbox.attempts < MAX_ATTEMPTS,
            )
            .order_by(NotificationOutbox.created_at)
            .limit(BATCH_SIZE)
            .with_for_update(skip_locked=True)
        )
    ).all()

    if not rows:
        return 0

    sent_count = 0

    for record in rows:
        try:
            # Resolve recipient email
            recipient_email = await _resolve_recipient(session, record)
            if not recipient_email:
                await _mark_failed(session, record, "No email address for recipient")
                continue

            # Build email
            envelope = await _build_envelope(session, record, recipient_email)
            if not envelope:
                await _mark_failed(session, record, "Unknown event type or missing data")
                continue

            # Send
            message_id = await client.send(envelope)

            # Mark sent
            record.sent_at = now
            record.payload = {
                **record.payload,
                "resend_message_id": message_id,
            }  # pyright: ignore[reportUnknownMemberType]
            sent_count += 1

        except Exception as exc:
            # Bump attempts and set next retry
            delay_idx = min(record.attempts, len(RETRY_DELAY_MINUTES) - 1)
            retry_delay = RETRY_DELAY_MINUTES[delay_idx]
            record.attempts += 1
            record.available_at = now + timedelta(minutes=retry_delay)
            # Store last error in payload for debugging
            record.payload = {
                **record.payload,
                "_last_error": str(exc)[:500],
            }  # pyright: ignore[reportUnknownMemberType]

        finally:
            await session.flush()

    await session.commit()
    return sent_count


async def _resolve_recipient(
    session: AsyncSession, record: NotificationOutbox
) -> str | None:
    """Get the recipient's email address."""
    if record.recipient_user_id is None:
        # Fallback: superadmin email from env
        return os.getenv("SUPERADMIN_EMAIL", "")
    user = await session.get(InternalUser, record.recipient_user_id)
    return user.email if user and user.email else None


async def _build_envelope(
    session: AsyncSession,
    record: NotificationOutbox,
    recipient_email: str,
) -> EmailEnvelope | None:
    """Render the email template for this notification event."""
    payload: dict[str, object] = record.payload  # type: ignore[assignment]

    if record.event_type == "content.review_requested":
        return await _review_requested_envelope(
            session, record, recipient_email, payload
        )
    if record.event_type == "content.changes_requested":
        return await _changes_requested_envelope(
            session, record, recipient_email, payload
        )
    if record.event_type == "content.review_approved":
        return await _review_approved_envelope(
            session, record, recipient_email, payload
        )
    return None


async def _review_requested_envelope(
    session: AsyncSession,
    record: NotificationOutbox,
    to: str,
    payload: dict[str, object],
) -> EmailEnvelope | None:
    slug = str(payload.get("slug", ""))
    entry_id = str(payload.get("entryId", ""))
    sender_name = await _submitted_by_name(session, record.aggregate_id)

    html = review_requested_email(
        reviewer_name="",
        article_slug=slug,
        entry_id=entry_id,
        sender_name=sender_name or "—",
    )
    return EmailEnvelope(
        to=to,
        subject=f"Novi tekst na pregledu — {slug}",
        html=html,
    )


async def _changes_requested_envelope(
    session: AsyncSession,
    record: NotificationOutbox,
    to: str,
    payload: dict[str, object],
) -> EmailEnvelope | None:
    slug = str(payload.get("slug", ""))
    entry_id = str(payload.get("entryId", ""))
    capability = str(payload.get("capability", ""))
    note = str(payload.get("note", ""))
    reviewer_name = await _actor_name(session, record)

    html = changes_requested_email(
        author_name="",
        article_slug=slug,
        entry_id=entry_id,
        reviewer_name=reviewer_name or "—",
        capability=capability,
        note=note,
    )
    return EmailEnvelope(
        to=to,
        subject=f"Izmene potrebne — {slug}",
        html=html,
    )


async def _review_approved_envelope(
    session: AsyncSession,
    record: NotificationOutbox,
    to: str,
    payload: dict[str, object],
) -> EmailEnvelope | None:
    slug = str(payload.get("slug", ""))
    entry_id = str(payload.get("entryId", ""))

    html = review_approved_email(
        author_name="",
        article_slug=slug,
        entry_id=entry_id,
    )
    return EmailEnvelope(
        to=to,
        subject=f"Tekst odobren — {slug}",
        html=html,
    )


async def _submitted_by_name(
    session: AsyncSession,
    revision_id: UUID | None,
) -> str | None:
    """Get the display name of the user who submitted this revision."""
    if revision_id is None:
        return None
    revision = await session.get(ContentRevision, revision_id)
    if revision is None or revision.created_by_user_id is None:
        return None
    user = await session.get(InternalUser, revision.created_by_user_id)
    return (
        user.display_name or user.email or str(user.id)
        if user
        else None
    )


async def _actor_name(
    session: AsyncSession,
    record: NotificationOutbox,
) -> str | None:
    """Get the display name of the user who created this outbox record.

    The outbox record itself doesn't carry an actor — we use the last
    event actor from the publication events table.
    """
    from psihointegritet.modules.content.models import ContentPublicationEvent

    event = (
        await session.scalars(
            select(ContentPublicationEvent)
            .where(ContentPublicationEvent.revision_id == record.aggregate_id)
            .order_by(ContentPublicationEvent.created_at.desc())
            .limit(1)
        )
    ).first()
    if event is None or event.actor_user_id is None:
        return None
    user = await session.get(InternalUser, event.actor_user_id)
    return (
        user.display_name or user.email or str(user.id)
        if user
        else None
    )


async def _mark_failed(
    session: AsyncSession,
    record: NotificationOutbox,
    reason: str,
) -> None:
    """Mark an outbox record as permanently failed."""
    record.attempts = MAX_ATTEMPTS
    record.payload = {
        **record.payload,
        "_permanent_failure": reason,
    }  # pyright: ignore[reportUnknownMemberType]
