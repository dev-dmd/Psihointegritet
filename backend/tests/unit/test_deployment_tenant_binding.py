"""The C2(a) deployment binding: which tenant a running backend serves.

`default_organization_slug` used to default to the founding tenant everywhere,
which was defensible while one tenant existed. It stopped being defensible the
day a second deployment went up: an unset variable there does not mean "the
founding tenant", it means somebody forgot — and the old default answered every
request for one organization out of another organization's deployment, with
nothing raised anywhere to say so.

These assertions pin the rule that replaced it. They are cheap and the failure
they guard against is silent, which is the combination worth a test.
"""

import pytest
from pydantic import ValidationError

from psihointegritet.core.config import FOUNDING_TENANT_SLUG, Environment, Settings


def settings(**overrides: object) -> Settings:
    """Construct without reading a developer's `.env`, so the test is the input."""
    return Settings(_env_file=None, **overrides)  # pyright: ignore[reportCallIssue]


def test_development_falls_back_to_the_founding_tenant() -> None:
    # A laptop with no configuration should still run; that convenience is the
    # only reason the fallback survives at all.
    assert settings(environment=Environment.DEVELOPMENT).default_organization_slug == (
        FOUNDING_TENANT_SLUG
    )


@pytest.mark.parametrize("environment", [Environment.STAGING, Environment.PRODUCTION])
def test_a_deployed_environment_without_a_tenant_refuses_to_start(
    environment: Environment,
) -> None:
    with pytest.raises(ValidationError) as error:
        settings(environment=environment)

    message = str(error.value)
    # The message has to name the variable and the environment, or an operator
    # reads "validation error" and goes looking in the wrong place.
    assert "DEFAULT_ORGANIZATION_SLUG" in message
    assert environment.value in message


@pytest.mark.parametrize(
    "environment",
    [Environment.DEVELOPMENT, Environment.STAGING, Environment.PRODUCTION],
)
def test_an_explicit_tenant_is_honoured_in_every_environment(
    environment: Environment,
) -> None:
    resolved = settings(environment=environment, default_organization_slug="sanja-neuer")
    assert resolved.default_organization_slug == "sanja-neuer"


def test_whitespace_is_not_a_tenant() -> None:
    # `DEFAULT_ORGANIZATION_SLUG=" "` in a dashboard is indistinguishable from
    # unset to a person, and must be indistinguishable to the application too.
    with pytest.raises(ValidationError):
        settings(environment=Environment.PRODUCTION, default_organization_slug="   ")
