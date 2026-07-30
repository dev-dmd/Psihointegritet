"""Slot schema registry (CG-C1) — ADR-017 §9, corrected by Amendment 2
(D-050, 2026-07-30) before any `slot_data` existed against it.

Mirrors `frontend/src/lib/content-governance/slot-schema.ts` field for
field. Parity between the two is asserted by
`contracts/fixtures/slot-schema.v1.json` (CG-A2 pattern).

**Placement note (deviation from the original plan):** the plan sketched
this under `shared/domain/`, alongside `rich_doc.py`. `SLOT_SPEC_REGISTRY` is
indexed by `ContentTemplate` and its `cta` fields reference `ContentType` —
both live in `modules/content/models.py`, not `shared/`. `rich_doc.py`
belongs in `shared/` because two independent modules (`privacy` and
`content`) both consume it; nothing outside `modules/content` needs this
registry, and importing `modules/content`'s own enums into `shared/` would
invert the dependency direction every other module in this codebase follows.

A slot has a state above its fields (`SlotSpec.editability`) because an
empty field map is ambiguous otherwise: it could mean "this slot is derived
at render time, never authored" (`computed`) or "we have no evidence of this
slot's real shape yet" (`unmodeled`, e.g. `support_area`, which has no page
anywhere in the repository). Only `editable` slots carry real
`SlotFieldSpec` fields, and the backend rejects any `slot_data` payload
targeting a `computed` slot (enforced in `publication.py::structural_findings`).

`SlotFieldSpec` is deliberately NOT recursive through the three collection
kinds (`RepeaterField.item` excludes repeater/imageList/ctaList) — one level
of nesting only. Unbounded nesting is the first step toward a free page
builder, which D-047 explicitly rules out.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Literal

from psihointegritet.modules.content.models import ContentTemplate, ContentType

__all__ = [
    "SLOT_SPEC_REGISTRY",
    "CollectionFieldSpec",
    "ContentCharacterLimitKey",
    "CtaAction",
    "CtaFieldSpec",
    "CtaListFieldSpec",
    "ImageFieldSpec",
    "IntegerFieldSpec",
    "MoneyFieldSpec",
    "NonRepeaterFieldSpec",
    "RepeaterFieldSpec",
    "RichFieldSpec",
    "SlotFieldSpec",
    "SlotOverrideMode",
    "SlotSpec",
    "TextFieldSpec",
]

# Mirrors frontend/src/lib/content-governance/types.ts::ContentCharacterLimitKey.
# The numeric values (`contentCharacterLimits`) have no Python mirror yet —
# field-value length validation is CG-C2's job ("živa validacija istim
# evaluatorima"), not this contract's. This Literal exists purely so the
# registry stays typo-checked and structurally comparable to the TS side.
ContentCharacterLimitKey = Literal[
    "navigationLabel",
    "ctaLabel",
    "eyebrow",
    "shortFact",
    "pageH1",
    "sectionH2",
    "cardTitle",
    "cardDescription",
    "heroLead",
    "sectionIntro",
    "richParagraph",
    "serviceDescription",
    "therapistPublicTitle",
    "therapistCardExcerpt",
    "therapistQuote",
    "therapistBioParagraph",
    "therapistFullBio",
    "faqQuestion",
    "faqAnswer",
    "seoTitle",
    "seoDescription",
    "imageAlt",
    "slug",
    "redirectPath",
]

# Mirrors frontend/src/lib/content-governance/types.ts::CtaAction.
CtaAction = Literal[
    "START_MATCHING",
    "BOOK_SERVICE",
    "BOOK_THERAPIST",
    "VIEW_SERVICE",
    "VIEW_THERAPIST",
    "VIEW_PROGRAM",
    "JOIN_PROGRAM_WAITLIST",
    "OPEN_COMPANY_CONFIGURATOR",
    "VIEW_PRICING",
    "GENERAL_CONTACT",
]


@dataclass(frozen=True, slots=True)
class TextFieldSpec:
    limit: ContentCharacterLimitKey
    required: bool = False
    kind: Literal["text"] = "text"


@dataclass(frozen=True, slots=True)
class RichFieldSpec:
    max_blocks: int
    # Omitted for fields with no reasonable character ceiling (e.g. a full
    # legal document body) — `max_blocks` is still a safety limit.
    max_chars: ContentCharacterLimitKey | None = None
    required: bool = False
    kind: Literal["rich"] = "rich"


@dataclass(frozen=True, slots=True)
class IntegerFieldSpec:
    min: int
    max: int
    step: int | None = None
    unit: Literal["minute", "session", "participant"] | None = None
    required: bool = False
    kind: Literal["integer"] = "integer"


@dataclass(frozen=True, slots=True)
class MoneyFieldSpec:
    min: int
    max: int
    currency: Literal["RSD"] = "RSD"
    required: bool = False
    kind: Literal["money"] = "money"


@dataclass(frozen=True, slots=True)
class ImageFieldSpec:
    required: bool = False
    kind: Literal["image"] = "image"


@dataclass(frozen=True, slots=True)
class CtaFieldSpec:
    allowed_actions: tuple[CtaAction, ...]
    target_type: ContentType | None = None
    required: bool = False
    kind: Literal["cta"] = "cta"


@dataclass(frozen=True, slots=True)
class CollectionFieldSpec:
    """`imageList` — a bounded count of `AssetReference`-shaped values, no
    further per-item schema (the value shape is fixed and universal, unlike
    `ctaList`, which needs its own `allowed_actions`)."""

    min: int
    max: int
    kind: Literal["imageList"] = "imageList"


@dataclass(frozen=True, slots=True)
class CtaListFieldSpec:
    """A bounded count of `{action, label, targetId?}` values. Needs its own
    `allowed_actions` — unlike `imageList`, the legal action set genuinely
    varies by context, same reasoning as the singular `cta` kind (Amendment 2
    §A2.6): an editor rendering this without a restriction would let an admin
    pick any CTA action, defeating that same protection."""

    min: int
    max: int
    allowed_actions: tuple[CtaAction, ...]
    target_type: ContentType | None = None
    kind: Literal["ctaList"] = "ctaList"


NonRepeaterFieldSpec = (
    TextFieldSpec
    | RichFieldSpec
    | IntegerFieldSpec
    | MoneyFieldSpec
    | ImageFieldSpec
    | CtaFieldSpec
)


@dataclass(frozen=True, slots=True)
class RepeaterFieldSpec:
    min: int
    max: int
    # `field(default_factory=dict)` can't spell the parametrized dict type
    # inline under strict pyright — same narrowing gap as `_Node.children` in
    # `shared/parsing/html_normalize.py`.
    item: dict[str, NonRepeaterFieldSpec] = field(  # pyright: ignore[reportUnknownVariableType]
        default_factory=dict
    )
    kind: Literal["repeater"] = "repeater"


SlotFieldSpec = NonRepeaterFieldSpec | CollectionFieldSpec | CtaListFieldSpec | RepeaterFieldSpec

#: Payload shape for an `editable` slot's *value* in `slot_data` (D-038
#: field-level fallback, locked here rather than deferred to CG-C3 —
#: Amendment 2 §A2.3). Mirrors `SlotOverride` in `slot-schema.ts`. `inherit`
#: uses the full static fallback; `override` carries authored `fields`, and
#: a field missing within an override still falls back to its static
#: counterpart where one exists; `hidden` is only a legal `mode` for a
#: `visibility="toggleable"` slot.
SlotOverrideMode = Literal["inherit", "override", "hidden"]


@dataclass(frozen=True, slots=True)
class EditableSlot:
    required: bool
    visibility: Literal["fixed", "toggleable"]
    fields: dict[str, SlotFieldSpec] = field(  # pyright: ignore[reportUnknownVariableType]
        default_factory=dict
    )
    editability: Literal["editable"] = "editable"


@dataclass(frozen=True, slots=True)
class ComputedSlot:
    reason: str
    editability: Literal["computed"] = "computed"


@dataclass(frozen=True, slots=True)
class UnmodeledSlot:
    reason: str
    editability: Literal["unmodeled"] = "unmodeled"


SlotSpec = EditableSlot | ComputedSlot | UnmodeledSlot


def _faq_items() -> RepeaterFieldSpec:
    return RepeaterFieldSpec(
        min=0,
        max=10,
        item={
            "question": TextFieldSpec(limit="faqQuestion", required=True),
            "answer": TextFieldSpec(limit="faqAnswer", required=True),
        },
    )


def _package_items() -> RepeaterFieldSpec:
    return RepeaterFieldSpec(
        min=0,
        max=6,
        item={
            "title": TextFieldSpec(limit="cardTitle", required=True),
            "deadline": TextFieldSpec(limit="cardDescription", required=True),
            "priceAmount": MoneyFieldSpec(min=0, max=500_000, required=True),
            "fullPriceAmount": MoneyFieldSpec(min=0, max=500_000),
        },
    )


SLOT_SPEC_REGISTRY: dict[ContentTemplate, dict[str, SlotSpec]] = {
    ContentTemplate.SERVICE_DETAIL: {
        "hero": EditableSlot(
            required=True,
            visibility="fixed",
            fields={
                "eyebrow": TextFieldSpec(limit="eyebrow"),
                "title": TextFieldSpec(limit="pageH1", required=True),
                "lead": TextFieldSpec(limit="heroLead"),
            },
        ),
        "facts": EditableSlot(
            required=True,
            visibility="fixed",
            fields={
                "duration": TextFieldSpec(limit="shortFact", required=True),
                "format": TextFieldSpec(limit="shortFact", required=True),
            },
        ),
        "description": EditableSlot(
            required=True,
            visibility="fixed",
            fields={
                "body": RichFieldSpec(max_blocks=6, max_chars="richParagraph", required=True),
            },
        ),
        "first_step": EditableSlot(
            required=True,
            visibility="fixed",
            fields={
                "body": RichFieldSpec(max_blocks=3, max_chars="richParagraph", required=True),
            },
        ),
        "related": ComputedSlot(
            reason="Terapeuti filtrirani po ServiceCatalogItem.therapistIds/bookingServiceSlugs "
            "i izvedene lokacije — nema autorskog polja."
        ),
        "cta": EditableSlot(
            required=True,
            visibility="fixed",
            fields={
                "primary": CtaFieldSpec(
                    allowed_actions=("BOOK_SERVICE",),
                    target_type=ContentType.SERVICE,
                    required=True,
                ),
            },
        ),
        "packages": EditableSlot(
            required=False, visibility="toggleable", fields={"items": _package_items()}
        ),
        "faq": EditableSlot(
            required=False, visibility="toggleable", fields={"items": _faq_items()}
        ),
    },
    ContentTemplate.THERAPIST_PROFILE: {
        "hero": EditableSlot(
            required=True,
            visibility="fixed",
            fields={
                "badge": TextFieldSpec(limit="shortFact"),
                "name": TextFieldSpec(limit="cardTitle", required=True),
                "title": TextFieldSpec(limit="therapistPublicTitle", required=True),
                "quote": TextFieldSpec(limit="therapistQuote"),
                "formats": TextFieldSpec(limit="shortFact"),
                "image": ImageFieldSpec(required=True),
            },
        ),
        "approach": EditableSlot(
            required=True,
            visibility="fixed",
            fields={"intro": RichFieldSpec(max_blocks=4, max_chars="therapistBioParagraph")},
        ),
        "areas": EditableSlot(
            required=True,
            visibility="fixed",
            fields={
                "items": RepeaterFieldSpec(
                    min=1,
                    max=12,
                    item={"label": TextFieldSpec(limit="shortFact", required=True)},
                ),
            },
        ),
        "services": EditableSlot(
            required=True,
            visibility="fixed",
            fields={
                "additionalServices": RepeaterFieldSpec(
                    min=0,
                    max=8,
                    item={
                        "title": TextFieldSpec(limit="cardTitle", required=True),
                        "duration": TextFieldSpec(limit="shortFact"),
                        "price": TextFieldSpec(limit="shortFact"),
                    },
                ),
            },
        ),
        "bio": EditableSlot(
            required=True,
            visibility="fixed",
            fields={
                "body": RichFieldSpec(max_blocks=10, max_chars="therapistFullBio", required=True),
                "cardExcerpt": TextFieldSpec(limit="therapistCardExcerpt"),
            },
        ),
        "cta": EditableSlot(
            required=True,
            visibility="fixed",
            fields={
                "primary": CtaFieldSpec(
                    allowed_actions=("BOOK_THERAPIST",),
                    target_type=ContentType.THERAPIST,
                    required=True,
                ),
            },
        ),
        "faq": EditableSlot(
            required=False, visibility="toggleable", fields={"items": _faq_items()}
        ),
        "media": UnmodeledSlot(
            reason="Therapist tip ima samo pojedinačan portret (već u hero.image) — nema "
            "galerije/video polja, nema dokaza o obliku."
        ),
    },
    ContentTemplate.SUPPORT_AREA: {
        "hero": UnmodeledSlot(
            reason="Nema dokaza — nijedna stranica ne koristi support_area template."
        ),
        "intro": UnmodeledSlot(
            reason="Nema dokaza — nijedna stranica ne koristi support_area template."
        ),
        "related": UnmodeledSlot(
            reason="Nema dokaza — nijedna stranica ne koristi support_area template."
        ),
        "cta": UnmodeledSlot(
            reason="Nema dokaza — nijedna stranica ne koristi support_area template."
        ),
        "faq": UnmodeledSlot(
            reason="Nema dokaza — nijedna stranica ne koristi support_area template."
        ),
    },
    ContentTemplate.AUDIENCE_PAGE: {
        "hero": EditableSlot(
            required=True,
            visibility="fixed",
            fields={"h1": TextFieldSpec(limit="pageH1", required=True)},
        ),
        "audience": UnmodeledSlot(
            reason="podrska-roditeljima/page.tsx nije pročitan u istraživanju; static-provider "
            "nema audience textField za ovaj entitet."
        ),
        "first_step": UnmodeledSlot(
            reason="Isti razlog kao audience — nema zabeleženog textField-a za ovu stranicu."
        ),
        "related": ComputedSlot(
            reason="parentPrograms() filtrirano po audienceTags — izvedeno, ne autorsko."
        ),
        "cta": EditableSlot(
            required=True,
            visibility="fixed",
            fields={
                "primary": CtaFieldSpec(
                    allowed_actions=("BOOK_SERVICE",),
                    target_type=ContentType.SERVICE,
                    required=True,
                ),
            },
        ),
        "program_cards": ComputedSlot(
            reason="Isti computed repeater kao related — parentPrograms() filter."
        ),
        "faq": UnmodeledSlot(reason="Nema FAQ podataka vezanih za ovu specifičnu stranicu."),
    },
    ContentTemplate.PROGRAM_DETAIL: {
        "hero": EditableSlot(
            required=True,
            visibility="fixed",
            fields={"title": TextFieldSpec(limit="cardTitle", required=True)},
        ),
        "facts": EditableSlot(
            required=True,
            visibility="fixed",
            fields={
                "sessions": TextFieldSpec(limit="shortFact", required=True),
                "details": TextFieldSpec(limit="shortFact"),
                "priceLine": TextFieldSpec(limit="cardDescription", required=True),
                "note": TextFieldSpec(limit="richParagraph"),
            },
        ),
        "audience": EditableSlot(
            required=True,
            visibility="fixed",
            fields={"body": TextFieldSpec(limit="cardDescription", required=True)},
        ),
        "format": UnmodeledSlot(
            reason="Nema posebne format sekcije u renderovanoj stranici — online/uživo info je "
            "deo details teksta."
        ),
        "status": UnmodeledSlot(
            reason="Status enum vrednost pokreće prikaz, ali vidljiv tekst je deljena globalna "
            "poruka — nema dokazanog autorskog polja."
        ),
        "facilitators": UnmodeledSlot(
            reason="GroupProgram tip eksplicitno nema facilitator polje."
        ),
        "faq": UnmodeledSlot(reason="Nema FAQ podataka vezanih za programe."),
        "registration": UnmodeledSlot(
            reason="GroupProgram tip nema registration podatke — aside prikazuje samo "
            "hardkodovanu globalnu poruku."
        ),
    },
    ContentTemplate.COMPANY_PAGE: {
        "hero": EditableSlot(
            required=True,
            visibility="fixed",
            fields={
                "title": TextFieldSpec(limit="pageH1", required=True),
                "lead": TextFieldSpec(limit="heroLead"),
            },
        ),
        "support_types": EditableSlot(
            required=True,
            visibility="fixed",
            fields={
                "items": RepeaterFieldSpec(
                    min=0,
                    max=6,
                    item={
                        "title": TextFieldSpec(limit="cardTitle", required=True),
                        "description": TextFieldSpec(limit="cardDescription", required=True),
                    },
                ),
            },
        ),
        "plans": EditableSlot(
            required=True,
            visibility="fixed",
            fields={
                "items": RepeaterFieldSpec(
                    min=0,
                    max=8,
                    item={
                        "title": TextFieldSpec(limit="cardTitle", required=True),
                        "description": TextFieldSpec(limit="cardDescription", required=True),
                    },
                ),
            },
        ),
        "privacy": EditableSlot(
            required=True,
            visibility="fixed",
            fields={
                "title": TextFieldSpec(limit="cardTitle"),
                "description": TextFieldSpec(limit="cardDescription"),
            },
        ),
        "configurator_cta": EditableSlot(
            required=True,
            visibility="fixed",
            fields={
                "primary": CtaFieldSpec(
                    allowed_actions=("OPEN_COMPANY_CONFIGURATOR",), required=True
                ),
                "bannerHeading": TextFieldSpec(limit="cardTitle"),
                "bannerBody": TextFieldSpec(limit="cardDescription"),
            },
        ),
        "faq": EditableSlot(
            required=False, visibility="toggleable", fields={"items": _faq_items()}
        ),
    },
    ContentTemplate.PRICING_PAGE: {
        "service_prices": ComputedSlot(
            reason="Mapira direktno preko serviceCatalog (naziv/trajanje/cena/format) — nema "
            "sopstvenih autorskih podataka."
        ),
        "packages": EditableSlot(
            required=True, visibility="fixed", fields={"items": _package_items()}
        ),
        "notice": EditableSlot(
            required=False,
            visibility="fixed",
            fields={"body": TextFieldSpec(limit="richParagraph")},
        ),
        "cta": EditableSlot(
            required=True,
            visibility="fixed",
            fields={
                "primary": CtaFieldSpec(
                    allowed_actions=("BOOK_SERVICE",),
                    target_type=ContentType.SERVICE,
                    required=True,
                ),
            },
        ),
        "program_references": ComputedSlot(
            reason="Mapira direktno preko groupPrograms — nema autorskih podataka."
        ),
    },
    ContentTemplate.STATIC_INFORMATION: {
        "hero": EditableSlot(
            required=True,
            visibility="fixed",
            fields={
                "h1": TextFieldSpec(limit="pageH1", required=True),
                "heroLead": TextFieldSpec(limit="heroLead"),
            },
        ),
        "intro": UnmodeledSlot(
            reason="Nijedna static_information stranica nema intro textField u "
            "static-provider-u — čist JSX, nedokazano."
        ),
        "prose": UnmodeledSlot(reason="Isto — nema strukturiranih podataka za prose, čist JSX."),
        "cta": EditableSlot(
            required=False,
            visibility="toggleable",
            fields={
                "items": CtaListFieldSpec(
                    min=0,
                    max=3,
                    allowed_actions=(
                        "START_MATCHING",
                        "BOOK_SERVICE",
                        "OPEN_COMPANY_CONFIGURATOR",
                        "VIEW_PRICING",
                        "GENERAL_CONTACT",
                    ),
                )
            },
        ),
        "faq": EditableSlot(
            required=False, visibility="toggleable", fields={"items": _faq_items()}
        ),
    },
    # The real authoring surface for legal_page content is the separate legal
    # document registry (modules/privacy, LD-7/screen-dokumenti.tsx) — this
    # registry entry exists so a ContentEntry on this template stays typed
    # correctly if one is ever created through modules/content generically,
    # mirroring the already-shipped LegalDocumentRevision shape rather than
    # inventing a second one.
    ContentTemplate.LEGAL_PAGE: {
        "title": EditableSlot(
            required=True,
            visibility="fixed",
            fields={"title": TextFieldSpec(limit="pageH1", required=True)},
        ),
        "legal_copy": EditableSlot(
            required=True,
            visibility="fixed",
            fields={"body": RichFieldSpec(max_blocks=500, required=True)},
        ),
        "version": EditableSlot(
            required=True,
            visibility="fixed",
            fields={"versionLabel": TextFieldSpec(limit="shortFact", required=True)},
        ),
        "links": UnmodeledSlot(
            reason="LegalDocumentPage komponenta ne renderuje links sekciju — nema dokaza o obliku."
        ),
    },
}
