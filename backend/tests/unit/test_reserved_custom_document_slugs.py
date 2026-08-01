import json
from pathlib import Path
from typing import TypedDict, cast

from psihointegritet.modules.privacy.service import RESERVED_CUSTOM_DOCUMENT_SLUGS


class ReservedSlugFixture(TypedDict):
    fixtureSchemaVersion: str
    description: str
    slugs: list[str]


FIXTURE_PATH = (
    Path(__file__).resolve().parents[3]
    / "contracts"
    / "fixtures"
    / "reserved-custom-document-slugs.v1.json"
)


def test_backend_reserved_slugs_match_the_shared_frontend_fixture() -> None:
    fixture = cast(
        ReservedSlugFixture,
        json.loads(FIXTURE_PATH.read_text(encoding="utf-8")),
    )

    assert fixture["fixtureSchemaVersion"] == "1"
    assert set(fixture["slugs"]) == RESERVED_CUSTOM_DOCUMENT_SLUGS
    assert "kompas" in RESERVED_CUSTOM_DOCUMENT_SLUGS
