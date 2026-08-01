"""Security tests for the shared HTML normalizer (CG-B7/CG-B8, ADR-017 §7).

Deferred by D-047, closed 2026-07-30 per D-050. Every RichDoc input — `.docx`
import, rich paste, plain paste — goes through `normalize_html_to_rich_doc`,
so this is the one place an XSS payload has to be defeated for all three
entry points at once.

The module's own contract is structural, not a denylist: `<script>` and every
other dangerous tag "cannot survive because it is absent from every allowlist
here". These tests hold that contract to its word — a malicious input must
never produce a `LinkMark` with a disallowed `href`, and the resulting
`RichDoc` can only ever contain the four allowlisted block types and three
mark kinds the dataclasses admit, which the renderer displays as plain React
text nodes and never as `dangerouslySetInnerHTML`.
"""

from collections.abc import Iterator

from psihointegritet.shared.domain.rich_doc import LinkMark, ListBlock, RichDoc, Span
from psihointegritet.shared.parsing.html_normalize import normalize_html_to_rich_doc


def _all_spans(doc: RichDoc) -> Iterator[Span]:
    for block in doc.blocks:
        if isinstance(block, ListBlock):
            for item in block.items:
                yield from item.spans
        else:
            yield from block.spans


def _all_text(doc: RichDoc) -> str:
    return " ".join(span.text for span in _all_spans(doc))


def test_script_tag_produces_no_executable_structure() -> None:
    doc, findings = normalize_html_to_rich_doc(
        "<p>Pre</p><script>alert(document.cookie)</script><p>Posle</p>"
    )
    # No block type other than the two paragraphs survives; a <script> can
    # never become a RichBlock because "script" is not one of the four types
    # the RichBlock union admits — this is a type-level guarantee, not a
    # runtime filter, so there is nothing here that could later be reached
    # by dangerouslySetInnerHTML.
    assert [block.type for block in doc.blocks] == ["paragraph", "paragraph"]
    assert findings == () or all(finding.severity != "error" for finding in findings)


def test_inline_script_inside_a_paragraph_is_reported_and_carries_no_marks() -> None:
    doc, findings = normalize_html_to_rich_doc("<p>Hello<script>alert(1)</script>World</p>")
    rule_ids = {finding.rule_id for finding in findings}
    assert "IMPORT-005" in rule_ids  # unknown element inside content is reported, not silent
    # Whatever text survives carries no marks — in particular no LinkMark,
    # so nothing here can become a clickable/executable reference.
    for span in _all_spans(doc):
        assert span.marks == ()


def test_javascript_href_is_rejected_and_the_link_text_survives_unmarked() -> None:
    doc, findings = normalize_html_to_rich_doc('<p><a href="javascript:alert(1)">Klikni</a></p>')
    for span in _all_spans(doc):
        for mark in span.marks:
            assert not isinstance(mark, LinkMark)
    assert "Klikni" in _all_text(doc)
    rule_ids = {finding.rule_id for finding in findings}
    assert "RICH-003" in rule_ids
    assert any(finding.severity == "error" for finding in findings if finding.rule_id == "RICH-003")


def test_data_uri_href_is_rejected() -> None:
    doc, findings = normalize_html_to_rich_doc(
        '<p><a href="data:text/html,<script>alert(1)</script>">Link</a></p>'
    )
    for span in _all_spans(doc):
        for mark in span.marks:
            assert not isinstance(mark, LinkMark)
    assert any(finding.rule_id == "RICH-003" for finding in findings)


def test_onclick_attribute_is_never_read_or_reproduced() -> None:
    doc, _findings = normalize_html_to_rich_doc(
        '<p><a href="https://psihointegritet.com" onclick="steal(document.cookie)">Link</a></p>'
    )
    # The only attribute this pipeline ever reads is `href` on `<a>` — verify
    # the onclick payload does not leak into the extracted text anywhere.
    assert "steal" not in _all_text(doc)
    assert "cookie" not in _all_text(doc)
    # A legitimate https:// href on the same tag is still honoured — this
    # is a positive control proving the attribute IS being read, just not
    # the dangerous one.
    found_link = False
    for span in _all_spans(doc):
        for mark in span.marks:
            if isinstance(mark, LinkMark):
                assert mark.href == "https://psihointegritet.com"
                found_link = True
    assert found_link


def test_img_onerror_is_never_read_image_is_always_dropped() -> None:
    doc, findings = normalize_html_to_rich_doc(
        '<p>Tekst<img src="x" onerror="alert(document.cookie)">više teksta</p>'
    )
    assert "alert" not in _all_text(doc)
    assert "onerror" not in _all_text(doc)
    assert any(finding.rule_id == "IMPORT-004" for finding in findings)


def test_svg_onload_payload_is_unwrapped_without_executing_or_leaking() -> None:
    doc, _findings = normalize_html_to_rich_doc(
        '<svg onload="alert(1)"><title>hi</title></svg><p>Posle</p>'
    )
    assert "alert" not in _all_text(doc)
    assert "onload" not in _all_text(doc)
    # The trailing paragraph still comes through — an unknown container being
    # unwrapped must not swallow unrelated sibling content.
    assert "Posle" in _all_text(doc)


def test_iframe_javascript_src_is_dropped() -> None:
    doc, _findings = normalize_html_to_rich_doc(
        '<iframe src="javascript:alert(1)"></iframe><p>Sadržaj</p>'
    )
    assert "javascript" not in _all_text(doc)
    assert "Sadržaj" in _all_text(doc)


def test_style_tag_content_never_reaches_a_link_mark() -> None:
    doc, _findings = normalize_html_to_rich_doc(
        "<style>body{background:url(javascript:alert(1))}</style><p>Tekst</p>"
    )
    for span in _all_spans(doc):
        for mark in span.marks:
            assert not isinstance(mark, LinkMark)
    assert "Tekst" in _all_text(doc)


def test_uppercase_and_mixed_case_script_tag_is_treated_the_same_as_lowercase() -> None:
    lower_doc, _ = normalize_html_to_rich_doc("<p>A</p><script>alert(1)</script><p>B</p>")
    mixed_doc, _ = normalize_html_to_rich_doc("<p>A</p><ScRiPt>alert(1)</ScRiPt><p>B</p>")
    assert [b.type for b in lower_doc.blocks] == [b.type for b in mixed_doc.blocks]


def test_malformed_unclosed_tags_do_not_raise() -> None:
    # HTMLParser tolerates unbalanced markup; the normalizer must never crash
    # on hostile or merely broken input from a paste or a hand-crafted upload.
    doc, _findings = normalize_html_to_rich_doc("<p>Tekst<script><img src=x onerror=alert(1)>")
    assert isinstance(doc.blocks, tuple)


def test_nested_script_inside_a_formatting_tag_leaves_no_trace() -> None:
    doc, _findings = normalize_html_to_rich_doc("<p><b><script>alert(1)</script></b></p>")
    assert "alert" not in _all_text(doc)
