from datetime import UTC, datetime

import pytest
from pydantic import ValidationError

from psihointegritet.modules.content.compass_schemas import (
    CompassContentCardOut,
    CompassRecommendationRequest,
)
from psihointegritet.modules.content.models import ContentTemplate, ContentType
from psihointegritet.modules.content.schemas import SeoFields
from psihointegritet.modules.content.taxonomy_models import ContentFormat


def valid_request(**updates: object) -> dict[str, object]:
    value: dict[str, object] = {
        "taxonomyVersion": "kompas-taxonomy-v1",
        "ruleVersion": "compass-rules-v1",
        "locale": "sr-Latn",
        "topicGroupId": "stres",
        "topicIds": ["burnout"],
        "audienceId": "odrasli",
        "goalIds": ["razumevanje"],
        "journeyIntent": "explore",
        "limit": 12,
        "offset": 0,
    }
    value.update(updates)
    return value


def valid_card(**updates: object) -> dict[str, object]:
    value: dict[str, object] = {
        "itemKey": "program:primer",
        "contentType": ContentType.PROGRAM,
        "slug": "primer",
        "locale": "sr-Latn",
        "template": ContentTemplate.PROGRAM_DETAIL,
        "seo": SeoFields(),
        "contentFormat": ContentFormat.PROGRAM,
        "accessLevel": "public",
        "publishedAt": datetime.now(UTC),
    }
    value.update(updates)
    return value


def test_request_accepts_stable_references_and_deduplicates_in_user_order() -> None:
    request = CompassRecommendationRequest.model_validate(
        valid_request(topicIds=["burnout", "burnout"], goalIds=["koraci", "koraci"])
    )

    assert request.topic_ids == ["burnout"]
    assert request.goal_ids == ["koraci"]


@pytest.mark.parametrize(
    ("field", "value"),
    [
        ("topicIds", ["jedan", "dva", "tri"]),
        ("goalIds", ["jedan", "dva", "tri"]),
        ("limit", 25),
        ("offset", -1),
    ],
)
def test_request_enforces_public_limits(field: str, value: object) -> None:
    with pytest.raises(ValidationError):
        CompassRecommendationRequest.model_validate(valid_request(**{field: value}))


@pytest.mark.parametrize("field", ["freeText", "contact", "therapistId", "score"])
def test_request_rejects_sensitive_or_unsupported_fields(field: str) -> None:
    with pytest.raises(ValidationError):
        CompassRecommendationRequest.model_validate(valid_request(**{field: "nije-dozvoljeno"}))


def test_request_rejects_slug_or_free_text_as_a_taxonomy_reference() -> None:
    with pytest.raises(ValidationError):
        CompassRecommendationRequest.model_validate(valid_request(topicIds=["Burnout tema!"]))


def test_anonymous_card_schema_cannot_claim_registered_access() -> None:
    with pytest.raises(ValidationError):
        CompassContentCardOut.model_validate(valid_card(accessLevel="registered"))


def test_anonymous_card_schema_rejects_raw_revision_slot_data() -> None:
    with pytest.raises(ValidationError):
        CompassContentCardOut.model_validate(
            valid_card(
                slotData={
                    "hiddenSection": {"mode": "hidden", "privateNote": "ne izlagati"},
                    "richDoc": {"href": "https://editor.example/private"},
                }
            )
        )
