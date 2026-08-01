"""Authoritative validation of CMS-authored revision data (CG-D4).

The public TypeScript Content Health pass still validates the *merged* public
entity (checked-in fallback plus a published CMS override).  The backend does
not own that fallback catalogue, so this module validates every value the CMS
is allowed to author: slot modes, field shapes, character/count/range limits,
RichDoc structure, images, CTA registry values, SEO shape and the canonical
slug.  Together those two boundaries avoid trusting browser-only validation
without duplicating the checked-in public catalogue in Python.
"""

from __future__ import annotations

import re
import unicodedata
from collections.abc import Mapping
from typing import cast

from psihointegritet.modules.content.models import ContentEntry, ContentRevision
from psihointegritet.modules.content.publication import ContentFinding, Severity
from psihointegritet.modules.content.slot_schema import (
    SLOT_SPEC_REGISTRY,
    CollectionFieldSpec,
    ComputedSlot,
    CtaFieldSpec,
    CtaListFieldSpec,
    EditableSlot,
    ImageFieldSpec,
    IntegerFieldSpec,
    MoneyFieldSpec,
    NonRepeaterFieldSpec,
    RepeaterFieldSpec,
    RichFieldSpec,
    SlotFieldSpec,
    TextFieldSpec,
    UnmodeledSlot,
)
from psihointegritet.shared.domain.rich_doc import parse_rich_doc, validate_rich_doc

CONTENT_HEALTH_RULESET_VERSION = "0.2"

# Mirrors frontend/src/lib/content-governance/limits.ts. These values are part
# of the governed authoring contract; a later registry consolidation may move
# them to a shared fixture, but the backend must enforce them now.
CONTENT_CHARACTER_LIMITS: Mapping[str, int] = {
    "navigationLabel": 28,
    "ctaLabel": 36,
    "eyebrow": 40,
    "shortFact": 140,
    "pageH1": 80,
    "sectionH2": 90,
    "cardTitle": 72,
    "cardDescription": 220,
    "heroLead": 300,
    "sectionIntro": 360,
    "richParagraph": 1200,
    "serviceDescription": 260,
    "therapistPublicTitle": 120,
    "therapistCardExcerpt": 300,
    "therapistQuote": 320,
    "therapistBioParagraph": 900,
    "therapistFullBio": 3600,
    "faqQuestion": 160,
    "faqAnswer": 800,
    "seoTitle": 65,
    "seoDescription": 170,
    "imageAlt": 150,
    "slug": 80,
    "redirectPath": 180,
}

_SLUG_PATTERN = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
_MISSING = object()


def _length(value: str) -> int:
    return len(unicodedata.normalize("NFC", value.strip()))


def _mapping(value: object) -> Mapping[str, object] | None:
    if not isinstance(value, Mapping):
        return None
    return cast("Mapping[str, object]", value)


def _items(value: object) -> list[object] | None:
    if not isinstance(value, list):
        return None
    return cast("list[object]", value)


def _finding(
    rule_id: str,
    severity: Severity,
    message: str,
    remediation: str,
    field_path: str,
) -> ContentFinding:
    return ContentFinding(
        rule_id=rule_id,
        rule_version="1",
        severity=severity,
        message=message,
        remediation=remediation,
        field_path=field_path,
    )


def _validate_text(path: str, spec: TextFieldSpec, value: object) -> list[ContentFinding]:
    if value is _MISSING or value is None or value == "":
        return []
    if not isinstance(value, str):
        return [
            _finding(
                "MODEL-003",
                "error",
                f"Polje „{path}” mora biti tekst.",
                "Unesite tekstualnu vrednost ili ostavite polje prazno radi fallbacka.",
                path,
            )
        ]
    limit = CONTENT_CHARACTER_LIMITS[spec.limit]
    length = _length(value)
    if length <= limit:
        return []
    return [
        _finding(
            "LIMIT-001",
            "error",
            f"Polje „{path}” ({length} znakova) prelazi limit od {limit}.",
            "Skratite sadržaj bez promene fonta ili rasporeda.",
            path,
        )
    ]


def _validate_rich(path: str, spec: RichFieldSpec, value: object) -> list[ContentFinding]:
    if value is _MISSING or value is None:
        return []
    document, parse_findings = parse_rich_doc(value)
    limit = CONTENT_CHARACTER_LIMITS[spec.max_chars] if spec.max_chars else None
    findings = list(parse_findings) + list(
        validate_rich_doc(document, max_blocks=spec.max_blocks, max_chars=limit)
    )
    return [
        ContentFinding(
            rule_id=item.rule_id,
            rule_version=item.rule_version,
            severity=item.severity,
            message=item.message,
            remediation=item.remediation,
            field_path=f"{path}.{item.field_path}" if item.field_path else path,
        )
        for item in findings
    ]


def _validate_number(
    path: str, spec: IntegerFieldSpec | MoneyFieldSpec, value: object
) -> list[ContentFinding]:
    if value is _MISSING or value is None:
        return []
    if isinstance(value, bool) or not isinstance(value, int | float):
        return [
            _finding(
                "MODEL-003",
                "error",
                f"Polje „{path}” mora biti broj.",
                "Unesite broj unutar dozvoljenog opsega.",
                path,
            )
        ]
    if isinstance(spec, IntegerFieldSpec) and not float(value).is_integer():
        return [
            _finding(
                "MODEL-003",
                "error",
                f"Polje „{path}” mora biti ceo broj.",
                "Unesite celobrojnu vrednost.",
                path,
            )
        ]
    if spec.min <= value <= spec.max:
        return []
    return [
        _finding(
            "LIMIT-001",
            "error",
            f"Vrednost polja „{path}” je van opsega [{spec.min}, {spec.max}].",
            "Unesite vrednost unutar dozvoljenog opsega.",
            path,
        )
    ]


def _validate_image(path: str, value: object) -> list[ContentFinding]:
    if value is _MISSING or value is None:
        return []
    image = _mapping(value)
    if image is None:
        return [
            _finding(
                "MODEL-003",
                "error",
                f"Slika u polju „{path}” nema važeći oblik.",
                "Izaberite asset kroz CMS biblioteku.",
                path,
            )
        ]
    asset_id = image.get("assetId")
    if asset_id in (None, ""):
        return []
    if not isinstance(asset_id, str):
        return [
            _finding(
                "ASSET-001",
                "error",
                f"Slika u polju „{path}” nema važeći assetId.",
                "Izaberite postojeći asset iz biblioteke.",
                path,
            )
        ]
    alt = image.get("alt")
    decorative = image.get("decorative") is True
    findings: list[ContentFinding] = []
    if not decorative and (not isinstance(alt, str) or not alt.strip()):
        findings.append(
            _finding(
                "ASSET-003",
                "error",
                f"Smislena slika u polju „{path}” nema alt tekst.",
                "Dodajte opisni alt tekst ili označite sliku kao dekorativnu.",
                f"{path}.alt",
            )
        )
    elif isinstance(alt, str) and _length(alt) > CONTENT_CHARACTER_LIMITS["imageAlt"]:
        findings.append(
            _finding(
                "LIMIT-001",
                "error",
                f"Alt tekst u polju „{path}” prelazi dozvoljeni limit.",
                "Skratite alt tekst.",
                f"{path}.alt",
            )
        )
    return findings


def _validate_cta(
    path: str, spec: CtaFieldSpec | CtaListFieldSpec, value: object
) -> list[ContentFinding]:
    if value is _MISSING or value is None:
        return []
    cta = _mapping(value)
    if cta is None:
        return [
            _finding(
                "CTA-001",
                "error",
                f"CTA u polju „{path}” nema važeći oblik.",
                "Koristite CMS izbor odobrene CTA akcije.",
                path,
            )
        ]
    action = cta.get("action")
    if action in (None, ""):
        return []
    findings: list[ContentFinding] = []
    if not isinstance(action, str) or action not in spec.allowed_actions:
        findings.append(
            _finding(
                "CTA-001",
                "error",
                f"CTA akcija „{action}” nije dozvoljena u polju „{path}”.",
                "Izaberite akciju ponuđenu za ovu sekciju.",
                f"{path}.action",
            )
        )
    label = cta.get("label")
    if label not in (None, "") and not isinstance(label, str):
        findings.append(
            _finding(
                "CTA-001",
                "error",
                f"CTA tekst u polju „{path}” mora biti tekst.",
                "Unesite tekst dugmeta.",
                f"{path}.label",
            )
        )
    elif isinstance(label, str) and _length(label) > CONTENT_CHARACTER_LIMITS["ctaLabel"]:
        findings.append(
            _finding(
                "LIMIT-001",
                "error",
                f"CTA tekst u polju „{path}” prelazi dozvoljeni limit.",
                "Skratite tekst dugmeta.",
                f"{path}.label",
            )
        )
    target_id = cta.get("targetId")
    if target_id not in (None, "") and not isinstance(target_id, str):
        findings.append(
            _finding(
                "CTA-002",
                "error",
                f"CTA target u polju „{path}” nema važeći oblik.",
                "Izaberite postojeći sadržaj iz registra.",
                f"{path}.targetId",
            )
        )
    if (
        spec.target_type is not None
        and isinstance(target_id, str)
        and target_id
        and not target_id.startswith(f"{spec.target_type.value}:")
    ):
        findings.append(
            _finding(
                "CTA-002",
                "error",
                f"CTA target „{target_id}” nije tipa {spec.target_type.value}.",
                "Izaberite kompatibilan postojeći sadržaj.",
                f"{path}.targetId",
            )
        )
    return findings


def _validate_field(path: str, spec: SlotFieldSpec, value: object) -> list[ContentFinding]:
    if isinstance(spec, TextFieldSpec):
        return _validate_text(path, spec, value)
    if isinstance(spec, RichFieldSpec):
        return _validate_rich(path, spec, value)
    if isinstance(spec, IntegerFieldSpec | MoneyFieldSpec):
        return _validate_number(path, spec, value)
    if isinstance(spec, ImageFieldSpec):
        return _validate_image(path, value)
    if isinstance(spec, CtaFieldSpec):
        return _validate_cta(path, spec, value)

    values = _items(value)
    if value is _MISSING or value is None:
        return []
    if values is None:
        return [
            _finding(
                "MODEL-003",
                "error",
                f"Polje „{path}” mora biti lista.",
                "Koristite CMS kontrole za dodavanje stavki.",
                path,
            )
        ]

    findings: list[ContentFinding] = []
    if isinstance(spec, CollectionFieldSpec):
        for index, item in enumerate(values):
            findings.extend(_validate_image(f"{path}[{index}]", item))
    elif isinstance(spec, CtaListFieldSpec):
        for index, item in enumerate(values):
            findings.extend(_validate_cta(f"{path}[{index}]", spec, item))
    if isinstance(spec, RepeaterFieldSpec):  # pyright: ignore[reportUnnecessaryIsInstance]
        for index, raw_item in enumerate(values):
            item = _mapping(raw_item)
            item_path = f"{path}[{index}]"
            if item is None:
                findings.append(
                    _finding(
                        "MODEL-003",
                        "error",
                        f"Stavka „{item_path}” nema važeći oblik.",
                        "Popravite ili uklonite stavku.",
                        item_path,
                    )
                )
                continue
            for unknown in sorted(set(item) - set(spec.item)):
                findings.append(
                    _finding(
                        "MODEL-003",
                        "error",
                        f"Polje „{item_path}.{unknown}” nije dozvoljeno.",
                        "Koristite samo polja definisana strukturom stavke.",
                        f"{item_path}.{unknown}",
                    )
                )
            for field_name, field_spec in spec.item.items():
                findings.extend(
                    _validate_field(
                        f"{item_path}.{field_name}",
                        cast(NonRepeaterFieldSpec, field_spec),  # pyright: ignore[reportUnnecessaryCast]
                        item.get(field_name, _MISSING),
                    )
                )
    return findings


def authored_content_findings(
    entry: ContentEntry, revision: ContentRevision
) -> tuple[ContentFinding, ...]:
    """Return findings for CMS-owned values, excluding structural findings.

    `publication.check_publishable()` always prepends its own
    `structural_findings`; keeping this function additive prevents duplicate
    findings while allowing the same result to power the standalone health
    endpoint and the authoritative publish/approve gates.
    """

    findings: list[ContentFinding] = []
    if (
        not _SLUG_PATTERN.fullmatch(entry.slug)
        or _length(entry.slug) > CONTENT_CHARACTER_LIMITS["slug"]
    ):
        findings.append(
            _finding(
                "MODEL-002",
                "error",
                "Canonical slug nije validan.",
                "Koristite lowercase latinicu, brojeve i crtice unutar dozvoljenog limita.",
                "slug",
            )
        )

    seo = _mapping(revision.seo)
    if seo is None:
        findings.append(
            _finding(
                "DISC-001",
                "error",
                "SEO podaci nemaju važeći oblik.",
                "Ponovo sačuvajte SEO naslov i opis.",
                "seo",
            )
        )
    else:
        for field_name, limit_name in (
            ("title", "seoTitle"),
            ("description", "seoDescription"),
        ):
            value = seo.get(field_name)
            path = f"seo.{field_name}"
            if not isinstance(value, str):
                findings.append(
                    _finding(
                        "DISC-001",
                        "error",
                        f"Polje „{path}” mora biti tekst.",
                        "Unesite tekst ili ostavite prazno radi sistemskog fallbacka.",
                        path,
                    )
                )
            elif _length(value) > CONTENT_CHARACTER_LIMITS[limit_name]:
                findings.append(
                    _finding(
                        "LIMIT-001",
                        "error",
                        f"Polje „{path}” prelazi dozvoljeni limit.",
                        "Skratite SEO sadržaj.",
                        path,
                    )
                )
        og_image = seo.get("og_image_asset_id", seo.get("ogImageAssetId"))
        if og_image is not None and not isinstance(og_image, str):
            findings.append(
                _finding(
                    "ASSET-001",
                    "error",
                    "SEO OG asset nema važeći identifikator.",
                    "Izaberite asset iz biblioteke ili koristite sistemski fallback.",
                    "seo.ogImageAssetId",
                )
            )

    slot_specs = SLOT_SPEC_REGISTRY[revision.template]
    for slot_name, raw_slot in revision.slot_data.items():
        spec = slot_specs.get(slot_name)
        if spec is None:
            continue  # structural_findings owns disallowed slot names
        slot = _mapping(raw_slot)
        if slot is None:
            findings.append(
                _finding(
                    "MODEL-003",
                    "error",
                    f"Sekcija „{slot_name}” nema važeći override oblik.",
                    "Izaberite Nasledi, Prepiši ili Sakrij.",
                    slot_name,
                )
            )
            continue
        mode = slot.get("mode")
        if mode not in ("inherit", "override", "hidden"):
            findings.append(
                _finding(
                    "MODEL-003",
                    "error",
                    f"Sekcija „{slot_name}” nema dozvoljen režim.",
                    "Izaberite Nasledi, Prepiši ili Sakrij.",
                    f"{slot_name}.mode",
                )
            )
            continue
        if isinstance(spec, ComputedSlot | UnmodeledSlot):
            if mode != "inherit":
                findings.append(
                    _finding(
                        "MODEL-003",
                        "error",
                        f"Sekcija „{slot_name}” nije autorsko polje.",
                        "Ostavite sekciju u režimu Nasledi.",
                        slot_name,
                    )
                )
            continue
        if not isinstance(spec, EditableSlot):  # pyright: ignore[reportUnnecessaryIsInstance]
            continue
        if mode == "hidden" and spec.visibility != "toggleable":
            findings.append(
                _finding(
                    "MODEL-003",
                    "error",
                    f"Obavezna sekcija „{slot_name}” ne može biti sakrivena.",
                    "Vratite sekciju na Nasledi ili Prepiši.",
                    slot_name,
                )
            )
            continue
        if mode != "override":
            continue
        fields = _mapping(slot.get("fields"))
        if fields is None:
            findings.append(
                _finding(
                    "MODEL-003",
                    "error",
                    f"Sekcija „{slot_name}” u režimu Prepiši nema polja.",
                    "Unesite dozvoljena polja ili vratite sekciju na Nasledi.",
                    f"{slot_name}.fields",
                )
            )
            continue
        for unknown in sorted(set(fields) - set(spec.fields)):
            findings.append(
                _finding(
                    "MODEL-003",
                    "error",
                    f"Polje „{slot_name}.{unknown}” nije dozvoljeno.",
                    "Koristite samo polja definisana strukturom ove stranice.",
                    f"{slot_name}.{unknown}",
                )
            )
        for field_name, field_spec in spec.fields.items():
            findings.extend(
                _validate_field(
                    f"{slot_name}.{field_name}",
                    field_spec,
                    fields.get(field_name, _MISSING),
                )
            )

    return tuple(findings)
