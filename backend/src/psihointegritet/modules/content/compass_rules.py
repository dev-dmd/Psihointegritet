"""Pure, deterministic v1 recommendation rules for Kompas.

Database eligibility is deliberately outside this module.  Callers may pass
only already-published, tenant-scoped, anonymous-public candidates.  The
module returns stable keys and reason signals, never a numeric score.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Final, Literal

COMPASS_RULE_VERSION: Final = "compass-rules-v1"

ReasonKind = Literal["topic", "area", "journey", "goal", "audience", "related-topic"]
ExpansionKind = Literal["exact", "area", "related", "secondary", "catalog", "none"]


@dataclass(frozen=True, slots=True)
class CandidateSignals:
    stable_key: str
    topic_group_id: str
    topic_ids: frozenset[str]
    journey_intent: str
    goal_ids: frozenset[str]
    audience_ids: frozenset[str]


@dataclass(frozen=True, slots=True)
class SelectionSignals:
    topic_group_id: str | None
    topic_ids: tuple[str, ...]
    journey_intent: str | None
    goal_ids: tuple[str, ...]
    audience_id: str | None


@dataclass(frozen=True, slots=True)
class ReasonSignal:
    kind: ReasonKind
    stable_id: str

    @property
    def code(self) -> str:
        return f"{self.kind}:{self.stable_id}"


@dataclass(frozen=True, slots=True)
class RankedCandidate:
    stable_key: str
    reasons: tuple[ReasonSignal, ...]


@dataclass(frozen=True, slots=True)
class RankingOutcome:
    candidates: tuple[RankedCandidate, ...]
    expansion: ExpansionKind


def _scope_candidates(
    candidates: tuple[CandidateSignals, ...],
    selection: SelectionSignals,
    related_topic_ids: frozenset[str],
) -> tuple[tuple[CandidateSignals, ...], ExpansionKind]:
    if selection.topic_ids:
        selected_topics = frozenset(selection.topic_ids)
        exact = tuple(item for item in candidates if item.topic_ids & selected_topics)
        if exact:
            return exact, "exact"

        if selection.topic_group_id is not None:
            area = tuple(
                item for item in candidates if item.topic_group_id == selection.topic_group_id
            )
            if area:
                return area, "area"

        related = tuple(item for item in candidates if item.topic_ids & related_topic_ids)
        if related:
            return related, "related"
        return (), "none"

    if selection.topic_group_id is not None:
        area = tuple(item for item in candidates if item.topic_group_id == selection.topic_group_id)
        return (area, "area") if area else ((), "none")

    has_secondary_signal = bool(
        selection.journey_intent or selection.goal_ids or selection.audience_id
    )
    if has_secondary_signal:
        selected_goals = frozenset(selection.goal_ids)
        secondary = tuple(
            item
            for item in candidates
            if (
                (
                    selection.journey_intent is not None
                    and item.journey_intent == selection.journey_intent
                )
                or bool(item.goal_ids & selected_goals)
                or (
                    selection.audience_id is not None and selection.audience_id in item.audience_ids
                )
            )
        )
        return (secondary, "secondary") if secondary else ((), "none")

    return candidates, "catalog"


def _reason_signals(
    candidate: CandidateSignals,
    selection: SelectionSignals,
    expansion: ExpansionKind,
    related_topic_ids: frozenset[str],
) -> tuple[ReasonSignal, ...]:
    reasons: list[ReasonSignal] = []
    for topic_id in selection.topic_ids:
        if topic_id in candidate.topic_ids:
            reasons.append(ReasonSignal("topic", topic_id))
            break
    if (
        selection.topic_group_id is not None
        and candidate.topic_group_id == selection.topic_group_id
    ):
        reasons.append(ReasonSignal("area", selection.topic_group_id))
    if (
        selection.journey_intent is not None
        and candidate.journey_intent == selection.journey_intent
    ):
        reasons.append(ReasonSignal("journey", selection.journey_intent))
    for goal_id in selection.goal_ids:
        if goal_id in candidate.goal_ids:
            reasons.append(ReasonSignal("goal", goal_id))
            break
    if selection.audience_id is not None and selection.audience_id in candidate.audience_ids:
        reasons.append(ReasonSignal("audience", selection.audience_id))
    if expansion == "related":
        related_match = sorted(candidate.topic_ids & related_topic_ids)
        if related_match:
            reasons.append(ReasonSignal("related-topic", related_match[0]))
    return tuple(reasons[:3])


def _ranking_key(
    candidate: CandidateSignals,
    selection: SelectionSignals,
) -> tuple[int, int, int, int, int, str]:
    selected_topics = frozenset(selection.topic_ids)
    selected_goals = frozenset(selection.goal_ids)
    return (
        -int(bool(candidate.topic_ids & selected_topics)),
        -int(
            selection.topic_group_id is not None
            and candidate.topic_group_id == selection.topic_group_id
        ),
        -int(
            selection.journey_intent is not None
            and candidate.journey_intent == selection.journey_intent
        ),
        -int(bool(candidate.goal_ids & selected_goals)),
        -int(selection.audience_id is not None and selection.audience_id in candidate.audience_ids),
        candidate.stable_key,
    )


def rank_candidates(
    candidates: tuple[CandidateSignals, ...],
    selection: SelectionSignals,
    *,
    related_topic_ids: frozenset[str] = frozenset(),
) -> RankingOutcome:
    """Rank eligible candidates lexicographically and deduplicate by stable key."""

    by_key: dict[str, CandidateSignals] = {}
    for candidate in candidates:
        by_key.setdefault(candidate.stable_key, candidate)
    unique = tuple(by_key[key] for key in sorted(by_key))
    scoped, expansion = _scope_candidates(unique, selection, related_topic_ids)
    ordered = sorted(scoped, key=lambda item: _ranking_key(item, selection))
    return RankingOutcome(
        candidates=tuple(
            RankedCandidate(
                stable_key=item.stable_key,
                reasons=_reason_signals(item, selection, expansion, related_topic_ids),
            )
            for item in ordered
        ),
        expansion=expansion,
    )
