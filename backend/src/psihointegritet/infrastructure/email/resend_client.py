"""Resend email client using raw httpx — no Python SDK needed.

Resend API is a simple POST to https://api.resend.com/emails with a
bearer token.  This keeps the dependency footprint minimal.
"""

from __future__ import annotations

import os
from dataclasses import dataclass

import httpx

RESEND_API_URL = "https://api.resend.com/emails"
RESEND_TIMEOUT = 15.0  # seconds


@dataclass(frozen=True)
class EmailEnvelope:
    to: str
    subject: str
    html: str
    reply_to: str | None = None


class ResendClient:
    """Minimal Resend HTTP client backed by httpx."""

    def __init__(self, api_key: str | None = None) -> None:
        self._api_key = api_key or os.getenv("RESEND_API_KEY", "")

    @property
    def configured(self) -> bool:
        return bool(self._api_key)

    async def send(self, envelope: EmailEnvelope) -> str | None:
        """Send one email via the Resend API.  Returns the message-id on
        success or raises :class:`httpx.HTTPStatusError` on failure."""
        if not self._api_key:
            raise RuntimeError("RESEND_API_KEY is not configured")

        async with httpx.AsyncClient(timeout=RESEND_TIMEOUT) as client:
            response = await client.post(
                RESEND_API_URL,
                json={
                    "from": _from_address(),
                    "to": [envelope.to],
                    "subject": envelope.subject,
                    "html": envelope.html,
                    **({"reply_to": envelope.reply_to} if envelope.reply_to else {}),
                },
                headers={
                    "Authorization": f"Bearer {self._api_key}",
                    "Content-Type": "application/json",
                },
            )
            response.raise_for_status()
            data = response.json()
            return data.get("id")


def _from_address() -> str:
    """Sender identity used for review notifications."""
    from_addr = os.getenv("EMAIL_FROM", "review@psihointegritet.com")
    # Format as `"Display Name" <email>` if no angle brackets present
    if "<" not in from_addr:
        from_addr = f'"Psihointegritet" <{from_addr}>'
    return from_addr
