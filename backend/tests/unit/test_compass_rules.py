from psihointegritet.modules.content.compass_rules import (
    CandidateSignals,
    SelectionSignals,
    rank_candidates,
)


def candidate(
    key: str,
    *,
    group: str = "stres",
    topics: frozenset[str] = frozenset({"burnout"}),
    journey: str = "explore",
    goals: frozenset[str] = frozenset({"razumevanje"}),
    audiences: frozenset[str] = frozenset({"odrasli"}),
) -> CandidateSignals:
    return CandidateSignals(
        stable_key=key,
        topic_group_id=group,
        topic_ids=topics,
        journey_intent=journey,
        goal_ids=goals,
        audience_ids=audiences,
    )


def selection(
    *,
    group: str | None = "stres",
    topics: tuple[str, ...] = ("burnout",),
    journey: str | None = "explore",
    goals: tuple[str, ...] = ("razumevanje",),
    audience: str | None = "odrasli",
) -> SelectionSignals:
    return SelectionSignals(
        topic_group_id=group,
        topic_ids=topics,
        journey_intent=journey,
        goal_ids=goals,
        audience_id=audience,
    )


def test_same_input_is_deterministic_and_uses_stable_key_as_final_tie_break() -> None:
    candidates = (candidate("program:z"), candidate("program:a"))

    first = rank_candidates(candidates, selection())
    second = rank_candidates(tuple(reversed(candidates)), selection())

    assert [item.stable_key for item in first.candidates] == ["program:a", "program:z"]
    assert first == second


def test_exact_topic_scope_wins_before_area_or_secondary_signals() -> None:
    exact = candidate(
        "program:exact",
        topics=frozenset({"burnout"}),
        journey="both",
        goals=frozenset({"drugi-cilj"}),
        audiences=frozenset({"druga-publika"}),
    )
    area_only = candidate(
        "program:area",
        topics=frozenset({"san"}),
        journey="explore",
    )

    result = rank_candidates((area_only, exact), selection())

    assert result.expansion == "exact"
    assert [item.stable_key for item in result.candidates] == ["program:exact"]


def test_empty_exact_scope_expands_only_to_the_selected_area() -> None:
    in_area = candidate("program:area", topics=frozenset({"san"}))
    unrelated = candidate(
        "program:unrelated",
        group="odnosi",
        topics=frozenset({"konflikt"}),
    )

    result = rank_candidates((unrelated, in_area), selection())

    assert result.expansion == "area"
    assert [item.stable_key for item in result.candidates] == ["program:area"]


def test_related_expansion_is_controlled_and_never_returns_unrelated_content() -> None:
    related = candidate(
        "program:related",
        group="odnosi",
        topics=frozenset({"granice"}),
    )
    unrelated = candidate(
        "program:unrelated",
        group="roditeljstvo",
        topics=frozenset({"bebe"}),
    )

    result = rank_candidates(
        (unrelated, related),
        selection(group=None),
        related_topic_ids=frozenset({"granice"}),
    )

    assert result.expansion == "related"
    assert [item.stable_key for item in result.candidates] == ["program:related"]


def test_reasons_are_plain_signals_capped_at_three_without_a_score() -> None:
    result = rank_candidates((candidate("program:a"),), selection())

    ranked = result.candidates[0]
    assert [reason.code for reason in ranked.reasons] == [
        "topic:burnout",
        "area:stres",
        "journey:explore",
    ]
    assert len(ranked.reasons) == 3
    assert not hasattr(ranked, "score")


def test_duplicate_content_identity_is_returned_once() -> None:
    result = rank_candidates(
        (candidate("program:a"), candidate("program:a")),
        selection(),
    )

    assert [item.stable_key for item in result.candidates] == ["program:a"]


def test_secondary_only_selection_does_not_fill_with_unrelated_catalogue_items() -> None:
    matching = candidate("program:matching", group="stres", journey="both")
    unrelated = candidate("program:unrelated", group="odnosi", journey="explore")

    result = rank_candidates(
        (unrelated, matching),
        selection(group=None, topics=(), journey="both", goals=(), audience=None),
    )

    assert result.expansion == "secondary"
    assert [item.stable_key for item in result.candidates] == ["program:matching"]
