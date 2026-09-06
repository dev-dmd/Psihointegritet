"""Create an organization, so a tenant is data rather than a schema change.

Until this existed the only organization in the database came from a
`bulk_insert` inside migration `20260722_0001`. Adding a second tenant that way
would have made "a customer signed up" a reason to write a migration — and the
fourth one a reason to write a fourth. A migration changes the *shape* of the
database; a tenant is its *content*.

The business logic lives here rather than in the command that calls it, mirroring
`modules/identity/provisioning.py`. Today the caller is
`scripts/provision_organization.py`; tomorrow it is the Superadmin onboarding
screen, and it must reach the same code rather than a second implementation that
drifts from this one.

Deliberately narrow: this creates the organization boundary and nothing else. No
public-site fields, no seeded content, no staff. Public identity is deployment
configuration under C2(a) (D-077 Amendment 1), and staff provisioning needs a
Clerk id that does not exist until the person signs up.
"""

import re
import unicodedata
from dataclasses import dataclass
from typing import Final
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from psihointegritet.core.locales import SUPPORTED_UI_LOCALES, is_supported_locale
from psihointegritet.modules.organizations.models import Organization
from psihointegritet.shared.domain.audit import (
    SYSTEM_AUDIT_ACTOR,
    OrganizationEventType,
    record_organization_event,
)


class OrganizationProvisioningError(RuntimeError):
    """Raised when the request cannot be applied as stated.

    Separate from `identity.provisioning.ProvisioningError` rather than shared:
    importing that one here would point this module at `modules/identity`, and
    organizations sit below identity — a membership needs an organization, not
    the other way round.
    """


#: Same shape as `content/identity.py` and `privacy/publication.py` enforce for
#: their own slugs. Copied rather than imported: both live in higher layers, so
#: importing either would invert the dependency. Lifting one shared helper into
#: `shared/` is worth doing, but as its own cleanup — not smuggled into the
#: change that first needs a third copy.
SLUG_PATTERN: Final = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")

#: Matches the `String(80)` column, so an over-long slug is refused with a
#: sentence instead of a database error.
SLUG_MAX_LENGTH: Final = 80

#: `String(160)` on `organizations.display_name`.
DISPLAY_NAME_MAX_LENGTH: Final = 160


def normalize_organization_slug(raw: str) -> str:
    """Fold an input into a slug, or refuse it.

    Normalization runs **once, at creation**. The result is then a stable
    identifier: nothing recomputes it from `display_name` on login or lookup.
    That distinction is load-bearing — renaming an organization to
    "Sanja Perković Neuer" must not move `sanja-neuer`, or every deployment
    pinned by `DEFAULT_ORGANIZATION_SLUG` and every organization lookup breaks
    at once, silently, for a change that looked cosmetic.

    Diacritics are transliterated, whitespace and punctuation collapse to single
    hyphens. Anything still outside `SLUG_PATTERN` afterwards is refused rather
    than mangled further, so the caller always learns which value was rejected.
    """
    folded = unicodedata.normalize("NFKD", raw.strip().lower())
    ascii_only = folded.encode("ascii", "ignore").decode("ascii")
    hyphenated = re.sub(r"[^a-z0-9]+", "-", ascii_only).strip("-")

    if not hyphenated:
        raise OrganizationProvisioningError(
            f"Slug {raw!r} contains no characters usable in a slug."
        )
    if len(hyphenated) > SLUG_MAX_LENGTH:
        raise OrganizationProvisioningError(
            f"Slug {hyphenated!r} is {len(hyphenated)} characters; the limit is {SLUG_MAX_LENGTH}."
        )
    if not SLUG_PATTERN.fullmatch(hyphenated):
        raise OrganizationProvisioningError(
            f"Slug {raw!r} normalizes to {hyphenated!r}, which is not a valid slug."
        )
    return hyphenated


@dataclass(frozen=True)
class OrganizationProvisioningRequest:
    #: Passed explicitly, never derived from `display_name`. A UI may *suggest*
    #: one, but the identity of a tenant is not a by-product of its title.
    slug: str
    display_name: str
    ui_locale: str
    default_content_locale: str


@dataclass(frozen=True)
class OrganizationProvisioningResult:
    organization_id: UUID
    slug: str
    #: `False` when the organization already existed and matched the request.
    created: bool


def _validate(request: OrganizationProvisioningRequest) -> tuple[str, str]:
    slug = normalize_organization_slug(request.slug)

    display_name = request.display_name.strip()
    if not display_name:
        raise OrganizationProvisioningError("Display name is required.")
    if len(display_name) > DISPLAY_NAME_MAX_LENGTH:
        raise OrganizationProvisioningError(
            f"Display name is {len(display_name)} characters; "
            f"the limit is {DISPLAY_NAME_MAX_LENGTH}."
        )

    for label, locale in (
        ("ui_locale", request.ui_locale),
        ("default_content_locale", request.default_content_locale),
    ):
        if not is_supported_locale(locale):
            supported = ", ".join(SUPPORTED_UI_LOCALES)
            raise OrganizationProvisioningError(
                f"{label} {locale!r} is not supported. Supported locales: {supported}."
            )

    return slug, display_name


def _conflicts(
    existing: Organization, *, display_name: str, request: OrganizationProvisioningRequest
) -> list[str]:
    return [
        f"{field}: stored {stored!r}, requested {wanted!r}"
        for field, stored, wanted in (
            ("display_name", existing.display_name, display_name),
            ("ui_locale", existing.ui_locale, request.ui_locale),
            (
                "default_content_locale",
                existing.default_content_locale,
                request.default_content_locale,
            ),
        )
        if stored != wanted
    ]


async def provision_organization(
    session: AsyncSession, request: OrganizationProvisioningRequest
) -> OrganizationProvisioningResult:
    """Create the organization, or return the existing one. Caller owns the transaction.

    Idempotent by contract: running it twice must not produce a second tenant,
    and must not fail on the unique constraint either. A bootstrap command that
    is unsafe to re-run is one nobody dares re-run, which is how half-applied
    environments happen.

    A slug that exists with different configuration is refused rather than
    updated. Overwriting would let a mistyped `--display-name` silently rename a
    live tenant, and this command has no way to know whether the stored value is
    the mistake or the requested one.
    """
    slug, display_name = _validate(request)

    existing = await session.scalar(select(Organization).where(Organization.slug == slug))
    if existing is not None:
        differences = _conflicts(existing, display_name=display_name, request=request)
        if differences:
            raise OrganizationProvisioningError(
                f"Organization '{slug}' already exists with different configuration "
                f"({'; '.join(differences)}). Refusing to overwrite — change the request, "
                f"or change the organization deliberately through its settings."
            )
        return OrganizationProvisioningResult(organization_id=existing.id, slug=slug, created=False)

    organization = Organization(
        slug=slug,
        display_name=display_name,
        ui_locale=request.ui_locale,
        default_content_locale=request.default_content_locale,
    )
    session.add(organization)
    # The audit row references the organization, so its id has to exist first.
    await session.flush()

    await record_organization_event(
        session,
        actor=SYSTEM_AUDIT_ACTOR,
        organization_id=organization.id,
        event_type=OrganizationEventType.ORGANIZATION_CREATED,
        # Configuration only. No addresses, no credentials, nothing that would
        # turn an append-only table into somewhere secrets go to live forever.
        details={
            "source": "bootstrap_cli",
            "slug": slug,
            "displayName": display_name,
            "uiLocale": request.ui_locale,
            "defaultContentLocale": request.default_content_locale,
        },
    )

    return OrganizationProvisioningResult(organization_id=organization.id, slug=slug, created=True)


@dataclass(frozen=True)
class OrganizationSummary:
    slug: str
    display_name: str
    ui_locale: str
    default_content_locale: str


async def list_organizations(session: AsyncSession) -> list[OrganizationSummary]:
    """Every tenant this database serves, for operators verifying a bootstrap."""
    rows = await session.scalars(select(Organization).order_by(Organization.slug))
    return [
        OrganizationSummary(
            slug=row.slug,
            display_name=row.display_name,
            ui_locale=row.ui_locale,
            default_content_locale=row.default_content_locale,
        )
        for row in rows
    ]
