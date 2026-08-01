"""Protected identities for tenant system-content overrides.

The public frontend owns the fallback copy and route rendering. This backend
allowlist owns the write boundary: staff may create the first blank override
for a registered system identity, but may not invent a route, slug or template
combination through a direct API call.

Legal routes are intentionally absent. They belong to the separate privacy
document registry and its RichDoc/Wiki public layout.
"""

from __future__ import annotations

from typing import Final

from psihointegritet.modules.content.models import ContentTemplate, ContentType

SYSTEM_CONTENT_LOCALE: Final = "sr-Latn"

SYSTEM_CONTENT_TEMPLATES: Final[dict[tuple[ContentType, str], ContentTemplate]] = {
    # Fixed public pages.
    (ContentType.STATIC_PAGE, "pocetna"): ContentTemplate.STATIC_INFORMATION,
    (ContentType.STATIC_PAGE, "o-nama"): ContentTemplate.STATIC_INFORMATION,
    (ContentType.STATIC_PAGE, "tim"): ContentTemplate.STATIC_INFORMATION,
    (ContentType.STATIC_PAGE, "usluge"): ContentTemplate.STATIC_INFORMATION,
    (ContentType.STATIC_PAGE, "radionice"): ContentTemplate.STATIC_INFORMATION,
    (ContentType.STATIC_PAGE, "podrska-roditeljima"): ContentTemplate.AUDIENCE_PAGE,
    (ContentType.STATIC_PAGE, "cene"): ContentTemplate.PRICING_PAGE,
    (ContentType.STATIC_PAGE, "znanje"): ContentTemplate.STATIC_INFORMATION,
    (ContentType.STATIC_PAGE, "rad-sa-kompanijama"): ContentTemplate.COMPANY_PAGE,
    (ContentType.STATIC_PAGE, "kontakt"): ContentTemplate.STATIC_INFORMATION,
    (ContentType.STATIC_PAGE, "pronadji-podrsku"): ContentTemplate.STATIC_INFORMATION,
    (ContentType.STATIC_PAGE, "zakazi"): ContentTemplate.STATIC_INFORMATION,
    # Current service detail routes.
    (ContentType.SERVICE, "individualna-psihoterapija"): ContentTemplate.SERVICE_DETAIL,
    (ContentType.SERVICE, "bracno-savetovanje"): ContentTemplate.SERVICE_DETAIL,
    (ContentType.SERVICE, "roditeljsko-savetovanje"): ContentTemplate.SERVICE_DETAIL,
    # Current therapist profiles.
    (ContentType.THERAPIST, "anja-stamenkovic"): ContentTemplate.THERAPIST_PROFILE,
    (ContentType.THERAPIST, "marija-stamenkovic"): ContentTemplate.THERAPIST_PROFILE,
    (ContentType.THERAPIST, "marjan-jankovic"): ContentTemplate.THERAPIST_PROFILE,
    # Current program detail routes.
    (ContentType.PROGRAM, "postpartalni-period"): ContentTemplate.PROGRAM_DETAIL,
    (ContentType.PROGRAM, "roditeljstvo-0-3"): ContentTemplate.PROGRAM_DETAIL,
    (ContentType.PROGRAM, "roditeljstvo-3-7"): ContentTemplate.PROGRAM_DETAIL,
    (ContentType.PROGRAM, "roditeljstvo-7-12"): ContentTemplate.PROGRAM_DETAIL,
    (ContentType.PROGRAM, "roditelj-tinejdzera"): ContentTemplate.PROGRAM_DETAIL,
    (ContentType.PROGRAM, "razumevanje-anksioznosti"): ContentTemplate.PROGRAM_DETAIL,
    (ContentType.PROGRAM, "tridesete"): ContentTemplate.PROGRAM_DETAIL,
    # Cards rendered on the company and pricing system pages.
    (ContentType.COMPANY_PLAN, "pojedinacni-pristup"): ContentTemplate.COMPANY_PAGE,
    (ContentType.COMPANY_PLAN, "team-flex"): ContentTemplate.COMPANY_PAGE,
    (ContentType.COMPANY_PLAN, "rezervisani-kapacitet"): ContentTemplate.COMPANY_PAGE,
    (ContentType.COMPANY_PLAN, "program-po-meri"): ContentTemplate.COMPANY_PAGE,
    (ContentType.PACKAGE_OFFER, "paket-5"): ContentTemplate.PRICING_PAGE,
    (ContentType.PACKAGE_OFFER, "paket-10"): ContentTemplate.PRICING_PAGE,
}


def is_system_content_definition(
    content_type: ContentType,
    slug: str,
    template: ContentTemplate,
    locale: str,
) -> bool:
    return (
        locale == SYSTEM_CONTENT_LOCALE
        and SYSTEM_CONTENT_TEMPLATES.get((content_type, slug)) == template
    )


def require_system_content_definition(
    content_type: ContentType,
    slug: str,
    template: ContentTemplate,
    locale: str,
) -> None:
    """Reject free-form CMS entry creation at the server boundary."""

    if locale != SYSTEM_CONTENT_LOCALE:
        raise ValueError(f"System content currently supports only locale {SYSTEM_CONTENT_LOCALE!r}")

    expected = SYSTEM_CONTENT_TEMPLATES.get((content_type, slug))
    if expected is None:
        raise ValueError(
            "This identity is not registered as system content; "
            "choose an existing page from the protected catalogue"
        )
    if template != expected:
        raise ValueError(
            f"System content {content_type.value}:{slug} requires template {expected.value!r}"
        )
