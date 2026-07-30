"""Security tests for `.docx` upload bounds (CG-B8, ADR-017 §7).

Deferred by D-047, closed 2026-07-30 per D-050. `_check_zip_bounds` runs
before mammoth decompresses a single byte, so these tests craft the zip's
central directory metadata directly rather than shipping real multi-hundred-
megabyte fixture files — a genuine zip bomb (`test_high_ratio_zip_entry_is
_rejected_before_decompression`) still uses real DEFLATE-compressed all-zero
bytes, just at a modest few-megabyte scale, since that alone is enough to
cross the default 100:1 ratio ceiling.
"""

import io
import zipfile

import pytest

from psihointegritet.shared.parsing.docx_import import (
    DocxImportLimits,
    DocxImportRejectedError,
    convert_docx_bytes,
)


def _docx_shaped_zip(entries: dict[str, bytes] | None = None) -> bytes:
    """A zip with the one file `_check_zip_bounds` requires to look like a
    `.docx` at all — real docx internals are not needed for the bounds
    checks, which run before mammoth ever opens the archive."""
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as archive:
        archive.writestr("[Content_Types].xml", "<Types/>")
        for name, data in (entries or {}).items():
            archive.writestr(name, data)
    return buffer.getvalue()


def test_empty_upload_is_rejected() -> None:
    with pytest.raises(DocxImportRejectedError, match="prazan"):
        convert_docx_bytes(b"")


def test_upload_larger_than_the_file_size_limit_is_rejected() -> None:
    data = _docx_shaped_zip()
    limits = DocxImportLimits(max_file_bytes=4)
    with pytest.raises(DocxImportRejectedError, match="prevelik"):
        convert_docx_bytes(data, limits=limits)


def test_non_zip_bytes_are_rejected_as_not_a_valid_docx() -> None:
    with pytest.raises(DocxImportRejectedError, match="nije važeći"):
        convert_docx_bytes(b"this is not a zip file at all")


def test_a_real_zip_missing_the_docx_marker_entry_is_rejected() -> None:
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w") as archive:
        archive.writestr("hello.txt", "not a docx")
    with pytest.raises(DocxImportRejectedError, match="nije važeći"):
        convert_docx_bytes(buffer.getvalue())


def test_high_ratio_zip_entry_is_rejected_before_decompression() -> None:
    # A genuine zip bomb: several megabytes of maximally-redundant bytes
    # compress to a tiny fraction of their size under DEFLATE, which is
    # exactly the ratio `_check_zip_bounds` exists to catch — no fake
    # metadata, this really does decompress to the declared size.
    bomb = b"\x00" * (8 * 1024 * 1024)
    data = _docx_shaped_zip({"word/document.xml": bomb})
    with pytest.raises(DocxImportRejectedError, match="kompresije"):
        convert_docx_bytes(data)


def test_total_uncompressed_size_over_the_limit_is_rejected_even_under_the_ratio_ceiling() -> None:
    # Real, only mildly-compressible text (not an all-zero bomb) that stays
    # under the default ratio limit but exceeds a tightened total-size cap —
    # proves the two checks are independent, not just one guarding the other.
    payload = b"Sadrzaj dokumenta. " * 2000  # ~38 KB, low compressibility
    data = _docx_shaped_zip({"word/document.xml": payload})
    limits = DocxImportLimits(max_uncompressed_bytes=1000, max_decompression_ratio=1000)
    with pytest.raises(DocxImportRejectedError, match="prevelik nakon raspakivanja"):
        convert_docx_bytes(data, limits=limits)


def test_a_small_well_formed_docx_shaped_archive_passes_the_bounds_check() -> None:
    # Bounds-only positive control: mammoth itself will still fail on this
    # (no real word/document.xml content), which is a separate, expected
    # failure mode this test does not exercise — it only proves a small,
    # normal-ratio archive is not rejected by `_check_zip_bounds` itself.
    data = _docx_shaped_zip({"word/document.xml": b"<xml>hello</xml>"})
    with pytest.raises(Exception) as excinfo:
        convert_docx_bytes(data)
    assert not isinstance(excinfo.value, DocxImportRejectedError)
