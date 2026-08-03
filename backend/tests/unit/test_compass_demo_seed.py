import pytest
from scripts.seed_compass_demo import validate_demo_seed_guard

from psihointegritet.core.config import Environment


def test_demo_seed_requires_explicit_opt_in_and_slug() -> None:
    with pytest.raises(RuntimeError, match="ALLOW_COMPASS_DEMO_SEED"):
        validate_demo_seed_guard(Environment.DEVELOPMENT, None, "demo")
    with pytest.raises(RuntimeError, match="ORGANIZATION_SLUG"):
        validate_demo_seed_guard(Environment.DEVELOPMENT, "true", None)


@pytest.mark.parametrize("environment", [Environment.STAGING, Environment.PRODUCTION])
def test_demo_seed_refuses_non_development(environment: Environment) -> None:
    with pytest.raises(RuntimeError, match="only in development"):
        validate_demo_seed_guard(environment, "true", "demo")


def test_demo_seed_accepts_explicit_development_scope() -> None:
    assert validate_demo_seed_guard(Environment.DEVELOPMENT, "true", " demo ") == "demo"
