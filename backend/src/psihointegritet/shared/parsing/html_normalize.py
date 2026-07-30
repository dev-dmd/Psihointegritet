"""One allowlist HTML normalizer shared by every RichDoc input (ADR-017 §7).

`.docx` import (`docx_import.py`), rich paste and plain paste all end up
here, so pasted and uploaded content cannot diverge into two different
results for the same source text. Unknown tags are unwrapped — children kept,
tag discarded — never dropped wholesale; unknown attributes are dropped.
`<script>` cannot survive because it is absent from every allowlist here, not
because it is stripped by a denylist.

Built on the stdlib `html.parser.HTMLParser` rather than a third-party HTML
library: the input already went through mammoth (a trusted converter) or a
browser's own paste serialization, so a permissive-but-allowlisted tokenizer
is enough, and it keeps this module dependency-free.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from html.parser import HTMLParser
from typing import Literal
from uuid import uuid4

from psihointegritet.shared.domain.rich_doc import (
    HeadingBlock,
    LinkMark,
    ListBlock,
    ListItem,
    Mark,
    ParagraphBlock,
    QuoteBlock,
    RichBlock,
    RichDoc,
    RichDocFinding,
    Span,
    is_allowed_href,
)

__all__ = [
    "normalize_html_to_rich_doc",
    "normalize_plain_text_to_rich_doc",
]

_BLOCK_TAGS = {"h1", "h2", "h3", "h4", "h5", "h6", "p", "ul", "ol", "li", "blockquote"}
_MARK_TAGS: dict[str, Literal["bold", "italic", "underline"]] = {
    "strong": "bold",
    "b": "bold",
    "em": "italic",
    "i": "italic",
    "u": "underline",
}
_IGNORED_INLINE = {"br"}
# Unlike a generic unknown wrapper (div, span, font…), whose children are real
# authored content and must survive when the tag itself is unwrapped, these
# two carry non-authored payload (code, CSS) that must never leak into a
# paragraph as visible text — found by CG-B8's security test pass: without
# this, "<script>alert(1)</script>" produced no executable structure (there
# is no script RichBlock to reach it), but its literal source text still
# survived as an ordinary, visible paragraph.
_DROP_ENTIRELY = {"script", "style"}


@dataclass
class _Node:
    tag: str
    attrs: dict[str, str]
    # `field(default_factory=list)` can't spell `list[_Node | str]` inline —
    # `_Node` doesn't exist in its own class body yet, so the factory stays
    # the bare builtin and pyright can't attach the parameter from there.
    children: list[_Node | str] = field(  # pyright: ignore[reportUnknownVariableType]
        default_factory=list
    )


class _TreeBuilder(HTMLParser):
    """Turns arbitrary HTML into a generic node tree — no allowlisting yet."""

    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.root = _Node(tag="#root", attrs={}, children=[])
        self._stack: list[_Node] = [self.root]

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        node = _Node(tag=tag.lower(), attrs={k: v for k, v in attrs if v is not None})
        self._stack[-1].children.append(node)
        if tag.lower() not in ("br", "img", "hr", "meta", "link"):
            self._stack.append(node)

    def handle_startendtag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        node = _Node(tag=tag.lower(), attrs={k: v for k, v in attrs if v is not None})
        self._stack[-1].children.append(node)

    def handle_endtag(self, tag: str) -> None:
        # Tolerant of unbalanced markup (real-world paste HTML is messy):
        # pop back to the matching open tag if one exists on the stack.
        for depth in range(len(self._stack) - 1, 0, -1):
            if self._stack[depth].tag == tag.lower():
                del self._stack[depth:]
                return

    def handle_data(self, data: str) -> None:
        if data:
            self._stack[-1].children.append(data)


@dataclass
class _Counters:
    headings: int = 0
    h1_demoted: int = 0
    paragraphs: int = 0
    lists: int = 0
    links: int = 0
    tables_dropped: int = 0
    images_dropped: int = 0
    unknown_dropped: int = 0


def _finding(
    rule_id: str, severity: Literal["info", "warning", "error"], message: str, remediation: str
) -> RichDocFinding:
    return RichDocFinding(
        rule_id=rule_id,
        rule_version="1",
        severity=severity,
        message=message,
        remediation=remediation,
    )


def _new_id() -> str:
    return str(uuid4())


def _inline_to_spans(
    nodes: list[_Node | str],
    marks: tuple[Mark, ...],
    findings: list[RichDocFinding],
    counters: _Counters,
) -> list[Span]:
    spans: list[Span] = []
    for node in nodes:
        if isinstance(node, str):
            # Whitespace-only text is kept as-is (it is a meaningful word
            # separator between inline tags, e.g. "text <b>bold</b> more");
            # only a genuinely empty string is dropped.
            if node:
                spans.append(Span(text=node, marks=marks))
            continue

        tag = node.tag
        if tag in _MARK_TAGS:
            mark = _MARK_TAGS[tag]
            next_marks = marks if mark in marks else (*marks, mark)
            spans.extend(_inline_to_spans(node.children, next_marks, findings, counters))
        elif tag == "a":
            href = node.attrs.get("href", "")
            if href and is_allowed_href(href):
                counters.links += 1
                link_mark: Mark = LinkMark(href=href)
                spans.extend(
                    _inline_to_spans(node.children, (*marks, link_mark), findings, counters)
                )
            else:
                if href:
                    findings.append(
                        _finding(
                            "RICH-003",
                            "error",
                            f"Link „{href}” nije dozvoljen i tekst je zadržan bez linka.",
                            "Koristiti https:// adresu, mailto: ili internu rutu.",
                        )
                    )
                spans.extend(_inline_to_spans(node.children, marks, findings, counters))
        elif tag in _IGNORED_INLINE:
            spans.append(Span(text=" ", marks=marks))
        elif tag == "img":
            counters.images_dropped += 1
            findings.append(
                _finding(
                    "IMPORT-004",
                    "warning",
                    "Slika iz dokumenta nije preneta.",
                    "Dodati sliku kroz galeriju sa opisnim alt tekstom.",
                )
            )
        elif tag == "table":
            counters.tables_dropped += 1
            findings.append(
                _finding(
                    "IMPORT-003",
                    "warning",
                    "Tabela iz dokumenta nije preneta (RichDoc v1 ne podržava tabele).",
                    "Uneti podatke ručno kroz dozvoljene blokove.",
                )
            )
        elif tag in _DROP_ENTIRELY:
            counters.unknown_dropped += 1
        else:
            counters.unknown_dropped += 1
            spans.extend(_inline_to_spans(node.children, marks, findings, counters))

    return spans


def _heading_level(tag: str) -> int:
    return int(tag[1])


def _flatten_to_spans(
    node: _Node, findings: list[RichDocFinding], counters: _Counters
) -> list[Span]:
    """Used only for `blockquote`, which may itself contain nested block tags
    (Word sometimes wraps quotes in a paragraph); everything inside collapses
    into one quote's spans."""
    spans: list[Span] = []
    for child in node.children:
        if isinstance(child, str) or child.tag not in _BLOCK_TAGS:
            spans.extend(_inline_to_spans([child], (), findings, counters))
        else:
            spans.extend(_flatten_to_spans(child, findings, counters))
    return spans


#  Inline/leaf tags that can legally appear loose at block level (no
# wrapping <p>) — e.g. a paste fragment that is just "<b>bold</b> word".
# These join the loose text run so `_inline_to_spans` keeps their formatting;
# an unrecognized container (div, span, font…) is unwrapped instead, since it
# carries no formatting of its own (ADR-017 §7 forward-compat contract).
_LOOSE_INLINE_TAGS = set(_MARK_TAGS) | {"a", "br", "img"}


def _blocks_from_nodes(
    nodes: list[_Node | str], findings: list[RichDocFinding], counters: _Counters
) -> list[RichBlock]:
    blocks: list[RichBlock] = []
    loose_text_run: list[_Node | str] = []

    def flush_loose_text() -> None:
        nonlocal loose_text_run
        if not loose_text_run:
            return
        spans = _inline_to_spans(loose_text_run, (), findings, counters)
        loose_text_run = []
        if spans:
            counters.paragraphs += 1
            blocks.append(ParagraphBlock(id=_new_id(), spans=tuple(spans)))

    for node in nodes:
        if isinstance(node, str):
            if node.strip():
                loose_text_run.append(node)
            continue

        tag = node.tag

        if tag in _LOOSE_INLINE_TAGS:
            loose_text_run.append(node)
            continue

        if tag in _DROP_ENTIRELY:
            flush_loose_text()
            counters.unknown_dropped += 1
            continue

        if tag not in _BLOCK_TAGS and tag != "table":
            # Unknown/container tag at block level (e.g. a paste wrapper
            # <div>): unwrap it — children flow into this same level
            # (ADR-017 §7 forward-compat contract).
            flush_loose_text()
            blocks.extend(_blocks_from_nodes(node.children, findings, counters))
            continue

        flush_loose_text()

        if tag in {"h1", "h2", "h3", "h4", "h5", "h6"}:
            raw_level = _heading_level(tag)
            level = min(raw_level + 1, 4)
            if raw_level == 1:
                counters.h1_demoted += 1
            spans = _inline_to_spans(node.children, (), findings, counters)
            if spans:
                counters.headings += 1
                blocks.append(
                    HeadingBlock(id=_new_id(), level=level, spans=tuple(spans))  # type: ignore[arg-type]
                )
        elif tag == "p":
            spans = _inline_to_spans(node.children, (), findings, counters)
            if spans:
                counters.paragraphs += 1
                blocks.append(ParagraphBlock(id=_new_id(), spans=tuple(spans)))
        elif tag in {"ul", "ol"}:
            items: list[ListItem] = []
            for child in node.children:
                if isinstance(child, _Node) and child.tag == "li":
                    item_spans = _inline_to_spans(child.children, (), findings, counters)
                    if item_spans:
                        items.append(ListItem(id=_new_id(), spans=tuple(item_spans)))
            if items:
                counters.lists += 1
                blocks.append(ListBlock(id=_new_id(), ordered=tag == "ol", items=tuple(items)))
        elif tag == "blockquote":
            spans = _flatten_to_spans(node, findings, counters)
            if spans:
                blocks.append(QuoteBlock(id=_new_id(), spans=tuple(spans)))
        elif tag == "table":
            counters.tables_dropped += 1
            findings.append(
                _finding(
                    "IMPORT-003",
                    "warning",
                    "Tabela iz dokumenta nije preneta (RichDoc v1 ne podržava tabele).",
                    "Uneti podatke ručno kroz dozvoljene blokove.",
                )
            )

    flush_loose_text()
    return blocks


_WHITESPACE_RUN = re.compile(r"[ \t]+")


def normalize_html_to_rich_doc(html: str) -> tuple[RichDoc, tuple[RichDocFinding, ...]]:
    """Convert allowlisted HTML into a `RichDoc`, with an `IMPORT-0xx` +
    `RICH-0xx` finding for everything that was demoted or dropped along the
    way — nothing is discarded silently (ADR-017 §8)."""
    parser = _TreeBuilder()
    parser.feed(html)
    parser.close()

    findings: list[RichDocFinding] = []
    counters = _Counters()
    blocks = _blocks_from_nodes(parser.root.children, findings, counters)

    if counters.h1_demoted:
        findings.append(
            _finding(
                "IMPORT-002",
                "info",
                f"{counters.h1_demoted} naslov(a) nivoa H1 spušteno je na H2.",
                "Nivo 1 je rezervisan za naslov stranice.",
            )
        )
    if counters.unknown_dropped:
        findings.append(
            _finding(
                "IMPORT-005",
                "warning",
                f"{counters.unknown_dropped} nepoznat(ih) elementa formatiranja je odbačeno.",
                "Proveriti rezultat uvoza pre objave.",
            )
        )
    findings.append(
        _finding(
            "IMPORT-001",
            "info",
            (
                f"Uvezeno: {counters.paragraphs} pasus(a), {counters.headings} naslov(a), "
                f"{counters.lists} list(e/a), {counters.links} link(ova)."
            ),
            "—",
        )
    )

    return RichDoc(blocks=tuple(blocks)), tuple(findings)


def normalize_plain_text_to_rich_doc(text: str) -> RichDoc:
    """Plain paste: a blank line splits paragraphs, nothing is guessed as a
    heading — plain text carries no structure to recover (ADR-017 §7)."""
    paragraphs = [
        _WHITESPACE_RUN.sub(" ", " ".join(line.strip() for line in chunk.splitlines())).strip()
        for chunk in re.split(r"\n\s*\n", text)
    ]
    blocks = tuple(
        ParagraphBlock(id=_new_id(), spans=(Span(text=paragraph),))
        for paragraph in paragraphs
        if paragraph
    )
    return RichDoc(blocks=blocks)
