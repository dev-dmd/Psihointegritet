"""`.docx` -> RichDoc import pipeline (ADR-017 §7, CG-B8).

Backend-only by design: a `.docx` is a ZIP, and parsing untrusted binaries is
a remote-code-execution / zip-bomb surface that belongs server-side under
explicit size and ratio limits. `ARCHITECTURAL_RULES_REVISED.md` §1.1
independently forbids this class of work in a Next.js Route Handler.

**Placement note (deviation from CMS_TODO.md's original CG-B8 sketch):** this
lives under `shared/parsing/`, not `modules/content/`. D-047 made the legal
document registry (`modules/privacy`) the FIRST consumer of `.docx` import —
before `modules/content` even has a router (CG-B4 lands after this step in
the Faza 0 sequence). Putting the parser inside either module would make the
other module reach sideways into it. This module carries no lifecycle or
approval rules of its own — it is a pure bytes-in/RichDoc-out transformation
— so `shared/` is the correct home, the same reasoning that put
`rich_doc.py` there.

Callers run `convert_docx_bytes` off the event loop (`asyncio.to_thread`):
mammoth and the zip inspection below are synchronous, CPU-bound work, and
rules §18 forbids blocking calls directly on the event loop.
"""

from __future__ import annotations

import io
import zipfile
from dataclasses import dataclass

import mammoth  # type: ignore[import-untyped]
from mammoth.images import img_element  # type: ignore[import-untyped]

from psihointegritet.shared.domain.rich_doc import RichDoc, RichDocFinding
from psihointegritet.shared.parsing.html_normalize import normalize_html_to_rich_doc

__all__ = [
    "DEFAULT_IMPORT_LIMITS",
    "DocxImportLimits",
    "DocxImportRejected",
    "DocxImportResult",
    "convert_docx_bytes",
]


class DocxImportRejected(ValueError):
    """Raised before or during parsing when the upload itself is not
    acceptable — never for content-quality problems, which surface as
    findings instead so the author gets a report, not a bare failure."""


@dataclass(frozen=True, slots=True)
class DocxImportLimits:
    max_file_bytes: int = 15 * 1024 * 1024  # a generously large Word document
    max_uncompressed_bytes: int = 100 * 1024 * 1024  # zip-bomb ceiling
    max_decompression_ratio: int = 100  # uncompressed : compressed, per zip entry
    max_blocks: int = 400


DEFAULT_IMPORT_LIMITS = DocxImportLimits()


@dataclass(frozen=True, slots=True)
class DocxImportResult:
    document: RichDoc
    findings: tuple[RichDocFinding, ...]


# mammoth ignores <u> by default (it is frequently overloaded for other
# purposes in real documents); ADR-017 explicitly wants underline preserved.
_STYLE_MAP = "u => u"


def _check_zip_bounds(data: bytes, limits: DocxImportLimits) -> None:
    """Reject before mammoth decompresses a single byte of content.

    Reading a zip's central directory costs nothing near the cost of
    decompressing a crafted archive that expands to gigabytes — this check
    must run first.
    """
    try:
        archive = zipfile.ZipFile(io.BytesIO(data))
    except zipfile.BadZipFile as error:
        raise DocxImportRejected("Fajl nije važeći .docx dokument.") from error

    with archive:
        names = archive.namelist()
        if "[Content_Types].xml" not in names:
            raise DocxImportRejected("Fajl nije važeći .docx dokument.")

        total_uncompressed = 0
        for info in archive.infolist():
            total_uncompressed += info.file_size
            compressed = max(info.compress_size, 1)
            if info.file_size / compressed > limits.max_decompression_ratio:
                raise DocxImportRejected("Fajl je odbijen: sumnjivo visok odnos kompresije.")
        if total_uncompressed > limits.max_uncompressed_bytes:
            raise DocxImportRejected("Fajl je odbijen: prevelik nakon raspakivanja.")


def _drop_image(_image: object) -> dict[str, str]:
    """RichDoc v1 has no image block (ADR-017 §6). The image's bytes are
    never read — `image.open()` is never called — so a malicious or merely
    huge embedded image costs nothing to "convert". The normalizer counts the
    resulting bare `<img>` tag as `IMPORT-004`."""
    return {}


def convert_docx_bytes(
    data: bytes, limits: DocxImportLimits = DEFAULT_IMPORT_LIMITS
) -> DocxImportResult:
    if not data:
        raise DocxImportRejected("Fajl je prazan.")
    if len(data) > limits.max_file_bytes:
        raise DocxImportRejected("Fajl je odbijen: prevelik.")

    _check_zip_bounds(data, limits)

    result = mammoth.convert_to_html(
        io.BytesIO(data),
        style_map=_STYLE_MAP,
        convert_image=img_element(_drop_image),
    )
    document, findings = normalize_html_to_rich_doc(result.value)

    if len(document.blocks) > limits.max_blocks:
        # Truncated, not rejected: the author still gets an import report for
        # everything up to the limit, plus a finding naming exactly why the
        # rest is missing — never a silent cut.
        document = RichDoc(blocks=document.blocks[: limits.max_blocks])
        findings = (
            *findings,
            RichDocFinding(
                rule_id="RICH-005",
                rule_version="1",
                severity="error",
                message=(
                    f"Dokument ima više od {limits.max_blocks} blokova; "
                    "sadržaj posle tog broja je odsečen."
                ),
                remediation="Podeliti dokument na manje celine pre uvoza.",
                field_path="blocks",
            ),
        )

    return DocxImportResult(document=document, findings=findings)
