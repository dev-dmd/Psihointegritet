"""Upload guards shared by every module that accepts a `.docx`.

Extracted from `modules/privacy/router.py::_read_docx` when the content module
gained its own import: two routers rejecting oversized or wrongly-named files
by two hand-copied rules is how one of them quietly stops rejecting.
"""

from fastapi import HTTPException, UploadFile, status

#: Guarded at the ASGI/proxy layer in production; this is the last line of
#: defense. Kept here so both routers cannot drift apart.
MAX_UPLOAD_BYTES = 15 * 1024 * 1024


async def read_docx_upload(file: UploadFile) -> bytes:
    """Read a `.docx` upload, or reject it before any parsing happens."""

    if file.filename and not file.filename.lower().endswith(".docx"):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail=(
                "Samo .docx fajlovi su podržani. Sačuvajte dokument kao .docx i pokušajte ponovo."
            ),
        )
    data = await file.read(MAX_UPLOAD_BYTES + 1)
    if len(data) > MAX_UPLOAD_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="Fajl je odbijen: prevelik.",
        )
    return data
