"""SQLAlchemy enum column helper.

`Enum(SomeStrEnum)` persists the member **name** by default, so a status would
land in PostgreSQL as `PUBLISHED` while every other layer speaks the lowercase
value `published`: JSON payloads, the generated TypeScript client, the shared
parity fixture, `server_default` literals and partial-index predicates.

That mismatch does not fail loudly. A partial unique index declared as
`WHERE status = 'published'` simply never matches a stored row, so the
constraint it was meant to enforce quietly stops existing — the exact defect
this helper was written to close.
"""

from enum import StrEnum

from sqlalchemy import Enum as SqlEnum


def value_enum[EnumT: StrEnum](enum_class: type[EnumT], *, length: int) -> SqlEnum:
    """A VARCHAR-backed enum column that stores member values, not names."""

    def member_values(enum: type[EnumT]) -> list[str]:
        return [member.value for member in enum]

    return SqlEnum(
        enum_class,
        native_enum=False,
        length=length,
        values_callable=member_values,
    )
