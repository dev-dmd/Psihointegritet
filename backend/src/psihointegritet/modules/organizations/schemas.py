"""Organization settings contract (D-077, ADR-026)."""

from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

#: `Literal` rather than `str`: FastAPI then rejects an unsupported locale with a
#: 422 before the service runs, and `openapi-typescript` generates a union the
#: frontend can switch on exhaustively. A plain `str` would push the same check
#: down to the database CHECK constraint, which answers with a 500.
UiLocale = Literal["en", "sr-Latn"]


class OrganizationSettingsOut(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: UUID
    slug: str
    display_name: str = Field(serialization_alias="displayName")
    ui_locale: UiLocale = Field(serialization_alias="uiLocale")
    default_content_locale: UiLocale = Field(serialization_alias="defaultContentLocale")


class OrganizationLocalesOut(BaseModel):
    """Just the locales — what the public read exposes."""

    model_config = ConfigDict(populate_by_name=True)

    ui_locale: UiLocale = Field(serialization_alias="uiLocale")
    default_content_locale: UiLocale = Field(serialization_alias="defaultContentLocale")


class OrganizationLocaleUpdate(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    ui_locale: UiLocale = Field(validation_alias="uiLocale")
    default_content_locale: UiLocale = Field(validation_alias="defaultContentLocale")
    #: Required when a platform operator changes another organization's settings.
    #: An intervention without a stated reason is indistinguishable from a
    #: mistake once the person who made it has moved on (D-078).
    reason: str | None = Field(default=None, max_length=280)
