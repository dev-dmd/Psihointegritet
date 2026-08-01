"""Explicit ownership of public content identities.

Templates describe rendering shape. This discriminator decides which
governed workflow owns creation, editing and publication.
"""

from enum import StrEnum


class ContentManagement(StrEnum):
    SYSTEM = "system"
    DOCUMENT = "document"
    ARTICLE = "article"
    INTERNAL = "internal"
