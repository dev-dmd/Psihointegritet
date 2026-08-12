"""Platform locale vocabulary (D-077, ADR-026).

Mirrors `frontend/src/i18n/locales.ts`. The two are kept in step by the CHECK
constraint on `organizations`: a locale the frontend renders but the database
refuses is an organization that cannot be saved, which is the failure this
duplication is allowed to have — loud, at write time, not silent at render.
"""

from typing import Final

#: What a new organization gets when nothing else is specified.
PLATFORM_DEFAULT_LOCALE: Final[str] = "en"

#: Every locale the platform UI can render. Order is display order.
SUPPORTED_UI_LOCALES: Final[tuple[str, ...]] = ("en", "sr-Latn")


def is_supported_locale(value: str) -> bool:
    return value in SUPPORTED_UI_LOCALES
