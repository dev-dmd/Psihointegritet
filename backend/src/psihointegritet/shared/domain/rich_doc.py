"""RichDoc v1 — canonical rich-text contract (ADR-017, CG-B7).

Mirrors `frontend/src/lib/content-governance/rich-doc.ts` field for field:
same four block types, same four marks, same rule IDs, same severity
meanings. Parity between the two is asserted by a shared fixture file, added
with the test pass D-047 defers to the end of the CMS + Booking milestones.

**Implementation choice, documented per CMS_TODO's CG-B7 instruction to pick
one:** a RichDoc is treated as the runtime JSON shape it actually is in the
database (`ContentRevision.slot_data`, `LegalDocumentRevision.body`), not as
something a caller pre-constructs. `parse_rich_doc` accepts raw `object` from
a JSON column and returns a typed, immutable tree plus any structural
findings collected while parsing — the same pattern
`modules/content/publication.py::structural_findings` already uses for
`Mapping[str, object]` slot data. Dataclasses (not Pydantic) keep this module
dependency-free like its sibling `shared/domain/publication.py`; pyright
strict mode is the type check that matters here, not a runtime schema
library.
"""

from __future__ import annotations

import re
import unicodedata
from dataclasses import dataclass
from typing import Literal
from urllib.parse import urlsplit

__all__ = [
    "RICH_DOC_SCHEMA_VERSION",
    "HeadingBlock",
    "LinkMark",
    "ListBlock",
    "ListItem",
    "ParagraphBlock",
    "QuoteBlock",
    "RichBlock",
    "RichDoc",
    "RichDocFinding",
    "Severity",
    "Span",
    "is_allowed_href",
    "parse_rich_doc",
    "rich_doc_text",
    "rich_doc_text_length",
    "validate_rich_doc",
]

RICH_DOC_SCHEMA_VERSION = 1

Severity = Literal["info", "warning", "error"]

# Same internal-path shape enforced elsewhere for redirects/CTAs. Kept local
# rather than imported to avoid a dependency from shared/domain onto a
# frontend-facing concept; both sides simply agree on the same regex.
_INTERNAL_PATH = re.compile(r"^/(?:[a-z0-9-]+/)*[a-z0-9-]*$")
_URL_LIKE = re.compile(r"^(https?://|www\.)\S+$", re.IGNORECASE)


@dataclass(frozen=True, slots=True)
class LinkMark:
    href: str
    type: Literal["link"] = "link"


Mark = Literal["bold", "italic", "underline"] | LinkMark


@dataclass(frozen=True, slots=True)
class Span:
    text: str
    marks: tuple[Mark, ...] = ()


@dataclass(frozen=True, slots=True)
class HeadingBlock:
    id: str
    level: Literal[2, 3, 4]
    spans: tuple[Span, ...]
    type: Literal["heading"] = "heading"


@dataclass(frozen=True, slots=True)
class ParagraphBlock:
    id: str
    spans: tuple[Span, ...]
    type: Literal["paragraph"] = "paragraph"


@dataclass(frozen=True, slots=True)
class ListItem:
    id: str
    spans: tuple[Span, ...]


@dataclass(frozen=True, slots=True)
class ListBlock:
    id: str
    ordered: bool
    items: tuple[ListItem, ...]
    type: Literal["list"] = "list"


@dataclass(frozen=True, slots=True)
class QuoteBlock:
    id: str
    spans: tuple[Span, ...]
    type: Literal["quote"] = "quote"


RichBlock = HeadingBlock | ParagraphBlock | ListBlock | QuoteBlock


@dataclass(frozen=True, slots=True)
class RichDoc:
    blocks: tuple[RichBlock, ...] = ()
    schema_version: int = RICH_DOC_SCHEMA_VERSION


@dataclass(frozen=True, slots=True)
class RichDocFinding:
    """Field-compatible with `modules.content.publication.ContentFinding` —
    a caller may pass these straight into `check_publishable`'s
    `extra_findings` once RichDoc validation is wired into a slot (CG-C1)."""

    rule_id: str
    rule_version: str
    severity: Severity
    message: str
    remediation: str
    field_path: str | None = None


def is_allowed_href(href: str) -> bool:
    """ADR-017: only `https://`, `mailto:` and internal routes are allowed."""
    if href.startswith("/"):
        return _INTERNAL_PATH.fullmatch(href.split("?", 1)[0]) is not None
    if href.startswith("mailto:"):
        return len(href) > len("mailto:")
    parsed = urlsplit(href)
    return parsed.scheme == "https"


def _block_spans(block: RichBlock) -> tuple[Span, ...]:
    if isinstance(block, ListBlock):
        return tuple(span for item in block.items for span in item.spans)
    return block.spans


def rich_doc_text(doc: RichDoc) -> str:
    """Plain-text content only — marks are not counted."""
    parts = [span.text for block in doc.blocks for span in _block_spans(block)]
    return " ".join(parts).strip()


def rich_doc_text_length(doc: RichDoc) -> int:
    return len(unicodedata.normalize("NFC", rich_doc_text(doc)))


# --- Parsing -----------------------------------------------------------
#
# Defensive: `raw` is untrusted JSON-column content. Malformed shapes produce
# an `error` finding and are skipped rather than raising, so one bad block
# does not prevent reporting the rest of the document's problems in one pass.


def _parse_mark(raw: object, path: str, findings: list[RichDocFinding]) -> Mark | None:
    if raw in ("bold", "italic", "underline"):
        return raw  # type: ignore[return-value]
    if isinstance(raw, dict) and raw.get("type") == "link":
        href = raw.get("href")
        if not isinstance(href, str):
            findings.append(
                RichDocFinding(
                    rule_id="RICH-002",
                    rule_version="1",
                    severity="error",
                    message="Link mark nema važeći href.",
                    remediation="Dodati href za link.",
                    field_path=path,
                )
            )
            return None
        return LinkMark(href=href)
    findings.append(
        RichDocFinding(
            rule_id="RICH-002",
            rule_version="1",
            severity="error",
            message="Nepoznat mark u tekstu.",
            remediation="Koristiti bold, italic, underline ili link.",
            field_path=path,
        )
    )
    return None


def _parse_span(raw: object, path: str, findings: list[RichDocFinding]) -> Span | None:
    if not isinstance(raw, dict) or not isinstance(raw.get("text"), str):
        findings.append(
            RichDocFinding(
                rule_id="RICH-002",
                rule_version="1",
                severity="error",
                message="Span nema tekstualni sadržaj.",
                remediation="Popraviti strukturu bloka.",
                field_path=path,
            )
        )
        return None
    raw_marks = raw.get("marks") or []
    if not isinstance(raw_marks, list):
        raw_marks = []
    marks = tuple(
        mark
        for i, raw_mark in enumerate(raw_marks)
        if (mark := _parse_mark(raw_mark, f"{path}.marks[{i}]", findings)) is not None
    )
    return Span(text=raw["text"], marks=marks)


def _parse_spans(raw: object, path: str, findings: list[RichDocFinding]) -> tuple[Span, ...]:
    if not isinstance(raw, list):
        return ()
    return tuple(
        span
        for i, raw_span in enumerate(raw)
        if (span := _parse_span(raw_span, f"{path}[{i}]", findings)) is not None
    )


def _parse_block(raw: object, path: str, findings: list[RichDocFinding]) -> RichBlock | None:
    if not isinstance(raw, dict):
        findings.append(
            RichDocFinding(
                rule_id="RICH-001",
                rule_version="1",
                severity="error",
                message="Blok nije važeći objekat.",
                remediation="Popraviti strukturu sadržaja.",
                field_path=path,
            )
        )
        return None

    block_id = raw.get("id")
    block_type = raw.get("type")
    if not isinstance(block_id, str) or not block_id:
        findings.append(
            RichDocFinding(
                rule_id="RICH-006",
                rule_version="1",
                severity="error",
                message="Blok nema stabilan id.",
                remediation="Dodeliti jedinstven id bloku.",
                field_path=path,
            )
        )
        return None

    if block_type == "heading":
        level = raw.get("level")
        if level not in (2, 3, 4):
            findings.append(
                RichDocFinding(
                    rule_id="RICH-001",
                    rule_version="1",
                    severity="error",
                    message="Naslov mora biti nivoa H2, H3 ili H4.",
                    remediation="H1 dolazi samo iz naslova stranice, ne iz tela teksta.",
                    field_path=path,
                )
            )
            return None
        return HeadingBlock(
            id=block_id, level=level, spans=_parse_spans(raw.get("spans"), f"{path}.spans", findings)
        )

    if block_type == "paragraph":
        return ParagraphBlock(
            id=block_id, spans=_parse_spans(raw.get("spans"), f"{path}.spans", findings)
        )

    if block_type == "quote":
        return QuoteBlock(
            id=block_id, spans=_parse_spans(raw.get("spans"), f"{path}.spans", findings)
        )

    if block_type == "list":
        raw_items = raw.get("items")
        items: list[ListItem] = []
        if isinstance(raw_items, list):
            for i, raw_item in enumerate(raw_items):
                if not isinstance(raw_item, dict) or not isinstance(raw_item.get("id"), str):
                    findings.append(
                        RichDocFinding(
                            rule_id="RICH-006",
                            rule_version="1",
                            severity="error",
                            message="Stavka liste nema stabilan id.",
                            remediation="Dodeliti jedinstven id stavci liste.",
                            field_path=f"{path}.items[{i}]",
                        )
                    )
                    continue
                items.append(
                    ListItem(
                        id=raw_item["id"],
                        spans=_parse_spans(
                            raw_item.get("spans"), f"{path}.items[{i}].spans", findings
                        ),
                    )
                )
        return ListBlock(id=block_id, ordered=bool(raw.get("ordered")), items=tuple(items))

    # Forward-compat: an unrecognized block type is skipped, not a parse
    # failure — a future format extension must stay additive (ADR-017 §5),
    # so this is reported as a warning, not an error.
    findings.append(
        RichDocFinding(
            rule_id="RICH-001",
            rule_version="1",
            severity="warning",
            message=f"Nepoznat tip bloka „{block_type}” je preskočen.",
            remediation="Ažurirati validator ako je ovo nameravano proširenje formata.",
            field_path=path,
        )
    )
    return None


def parse_rich_doc(raw: object) -> tuple[RichDoc, tuple[RichDocFinding, ...]]:
    """Parse a JSON-column value into a `RichDoc`, collecting findings for any
    malformed piece instead of raising. An unparseable document parses to an
    empty one plus a top-level finding, so a caller always has something
    renderable to work with."""
    findings: list[RichDocFinding] = []
    if not isinstance(raw, dict) or not isinstance(raw.get("blocks"), list):
        findings.append(
            RichDocFinding(
                rule_id="RICH-001",
                rule_version="1",
                severity="error",
                message="Sadržaj nije važeći RichDoc dokument.",
                remediation="Ponovo uvesti ili uneti sadržaj.",
                field_path="blocks",
            )
        )
        return RichDoc(), tuple(findings)

    blocks = tuple(
        block
        for i, raw_block in enumerate(raw["blocks"])
        if (block := _parse_block(raw_block, f"blocks[{i}]", findings)) is not None
    )
    return RichDoc(blocks=blocks), tuple(findings)


def validate_rich_doc(
    doc: RichDoc,
    *,
    allowed_blocks: tuple[str, ...] | None = None,
    max_blocks: int | None = None,
    max_chars: int | None = None,
) -> tuple[RichDocFinding, ...]:
    """Structural + limit validation beyond parsing. Deliberately does not
    flag an empty document as an error — see the equivalent note in
    `rich-doc.ts::validateRichDoc`; required-ness is the calling layer's rule.
    """
    findings: list[RichDocFinding] = []
    seen: set[str] = set()

    def check_id(block_id: str, path: str) -> None:
        if block_id in seen:
            findings.append(
                RichDocFinding(
                    rule_id="RICH-006",
                    rule_version="1",
                    severity="error",
                    message=f"Blok id „{block_id}” je dupliran.",
                    remediation="Generisati nov, jedinstven id za svaki blok i stavku liste.",
                    field_path=path,
                )
            )
        seen.add(block_id)

    for index, block in enumerate(doc.blocks):
        path = f"blocks[{index}]"
        check_id(block.id, path)

        if allowed_blocks is not None and block.type not in allowed_blocks:
            findings.append(
                RichDocFinding(
                    rule_id="RICH-001",
                    rule_version="1",
                    severity="error",
                    message=f"Tip bloka „{block.type}” nije dozvoljen u ovoj sekciji.",
                    remediation="Koristiti samo blokove dozvoljene za ovaj slot.",
                    field_path=path,
                )
            )

        if isinstance(block, ListBlock):
            for item_index, item in enumerate(block.items):
                item_path = f"{path}.items[{item_index}]"
                check_id(item.id, item_path)
                findings.extend(_validate_spans(item.spans, f"{item_path}.spans"))
        else:
            findings.extend(_validate_spans(block.spans, f"{path}.spans"))

    if max_blocks is not None and len(doc.blocks) > max_blocks:
        findings.append(
            RichDocFinding(
                rule_id="RICH-005",
                rule_version="1",
                severity="error",
                message=f"Broj blokova ({len(doc.blocks)}) prelazi dozvoljenih {max_blocks}.",
                remediation="Skratiti tekst ili podeliti u više sekcija.",
                field_path="blocks",
            )
        )

    if max_chars is not None:
        length = rich_doc_text_length(doc)
        if length > max_chars:
            findings.append(
                RichDocFinding(
                    rule_id="LIMIT-001",
                    rule_version="1",
                    severity="error",
                    message=f"Tekst ({length} znakova) prelazi limit od {max_chars} znakova.",
                    remediation="Skratiti sadržaj bez promene formatiranja.",
                    field_path="blocks",
                )
            )

    return tuple(findings)


def _validate_spans(spans: tuple[Span, ...], path: str) -> tuple[RichDocFinding, ...]:
    findings: list[RichDocFinding] = []
    for index, span in enumerate(spans):
        span_path = f"{path}[{index}]"
        has_underline = False
        for mark in span.marks:
            if isinstance(mark, LinkMark):
                if not is_allowed_href(mark.href):
                    findings.append(
                        RichDocFinding(
                            rule_id="RICH-003",
                            rule_version="1",
                            severity="error",
                            message=f"Link „{mark.href}” nije dozvoljen.",
                            remediation="Koristiti https:// adresu, mailto: ili internu rutu.",
                            field_path=span_path,
                        )
                    )
            elif mark == "underline":
                has_underline = True
        if has_underline and _URL_LIKE.match(span.text.strip()):
            findings.append(
                RichDocFinding(
                    rule_id="RICH-004",
                    rule_version="1",
                    severity="warning",
                    message="Podvučen tekst izgleda kao URL.",
                    remediation="Pretvoriti u pravi link umesto podvlačenja.",
                    field_path=span_path,
                )
            )
    return tuple(findings)
