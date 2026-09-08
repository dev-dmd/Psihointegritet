"""Password hashing: one configuration, and the rehash path that keeps it current."""

from argon2 import PasswordHasher

from psihointegritet.modules.identity.auth.hashing import PasswordService
from psihointegritet.modules.identity.auth.policy import AuthPolicy

#: Deliberately cheap. These tests assert behaviour, not cost, and production
#: parameters would put seconds on the suite for no extra coverage.
FAST = AuthPolicy(argon2_memory_cost=8, argon2_time_cost=1, argon2_parallelism=1)


def test_a_hash_verifies_and_is_salted() -> None:
    service = PasswordService(FAST)
    first = service.hash("tajna-lozinka")
    second = service.hash("tajna-lozinka")

    assert service.verify(first, "tajna-lozinka")
    # Same password, different hash: the salt is per-hash, so a stolen table
    # cannot be attacked once for every account that shares a password.
    assert first != second
    assert first.startswith("$argon2id$")


def test_a_wrong_password_is_refused() -> None:
    service = PasswordService(FAST)
    assert not service.verify(service.hash("tacna"), "netacna")


def test_an_unreadable_hash_is_refused_rather_than_raising() -> None:
    """Callers get one answer for every failure.

    A corrupt or truncated hash raising where a wrong password returns False
    would let the two be told apart — by a stack trace, or by response timing
    on an endpoint that handles one and not the other.
    """
    service = PasswordService(FAST)
    for damaged in ("", "not-a-hash", "$argon2id$v=19$truncated"):
        assert not service.verify(damaged, "bilo-sta")


def test_a_hash_made_with_weaker_parameters_wants_a_rehash() -> None:
    """Raising the cost has to upgrade existing accounts, not strand them."""
    weak = PasswordHasher(time_cost=1, memory_cost=8, parallelism=1)
    stored = weak.hash("lozinka")

    stronger = PasswordService(AuthPolicy(argon2_memory_cost=64, argon2_time_cost=2))
    assert stronger.needs_rehash(stored)
    # And the old hash still verifies, so the upgrade happens on sign-in rather
    # than by locking everyone out.
    assert stronger.verify(stored, "lozinka")


def test_a_current_hash_does_not_want_a_rehash() -> None:
    service = PasswordService(FAST)
    assert not service.needs_rehash(service.hash("lozinka"))


def test_an_unreadable_hash_is_treated_as_needing_replacement() -> None:
    assert PasswordService(FAST).needs_rehash("garbage")
