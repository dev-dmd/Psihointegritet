import {
  compassFallbackRegistry,
  type CompassContentCard,
} from "../fallback-registry";
import type { CompassSelection } from "./selection";

/**
 * Preview-only matching over the fallback registry.
 *
 * ⚠️ This is **not** the recommendation authority. The real engine is
 * `backend/.../modules/content/compass_rules.py`, carries a `ruleVersion` and is
 * reached through `features/compass/api/recommendations.ts`. This function
 * exists so the flow can be reviewed before any area or topic is published —
 * the registry currently holds zero of both — and it is used only when the
 * fallback registry is in play.
 *
 * It is deliberately trivial: a filter plus a declared sort. No weights, no
 * score, no tie-break heuristics — anything richer would quietly become a
 * second engine competing with the backend's rules.
 */

export interface CompassPreviewReason {
  /** Stable code, matching the backend's reason vocabulary shape. */
  code: string;
  /** Plain-language sentence shown on the card. */
  label: string;
}

export interface CompassPreviewResult {
  card: CompassContentCard;
  /** At most three, per KOMPAS_TODO §8. */
  reasons: readonly CompassPreviewReason[];
}

function reasonsFor(
  card: CompassContentCard,
  selection: CompassSelection,
  labels: { topics: Map<string, string>; goals: Map<string, string> },
): CompassPreviewReason[] {
  const reasons: CompassPreviewReason[] = [];

  for (const topicId of selection.topicIds) {
    if (!card.topicStableIds.includes(topicId)) continue;
    const label = labels.topics.get(topicId);
    if (!label) continue;
    reasons.push({ code: `topic:${topicId}`, label: `Tema: ${label}` });
  }

  if (
    selection.topicGroupId &&
    card.areaStableId === selection.topicGroupId &&
    reasons.length === 0
  ) {
    reasons.push({
      code: `topic_group:${selection.topicGroupId}`,
      label: "Pripada oblasti koju ste izabrali",
    });
  }

  for (const goalId of selection.goalIds) {
    if (!card.goalIds.includes(goalId)) continue;
    const label = labels.goals.get(goalId);
    if (!label) continue;
    reasons.push({ code: `goal:${goalId}`, label });
  }

  return reasons.slice(0, 3);
}

/**
 * Returns cards that match the selection, most specific first.
 *
 * Empty-state expansion follows KOMPAS_TODO §8: a topic hit outranks an area
 * hit, and when nothing matches the caller falls back to the area — never to
 * unrelated content just to avoid an empty list.
 */
export function previewCompassResults(
  selection: CompassSelection,
  limit = 12,
): readonly CompassPreviewResult[] {
  const registry = compassFallbackRegistry;
  const topicLabels = new Map(
    registry.areas.flatMap((area) =>
      area.topics.map((topic) => [topic.stableId, topic.label] as const),
    ),
  );
  const goalLabels = new Map(
    registry.goals.map((goal) => [goal.id, goal.label] as const),
  );

  const selectedTopics = new Set(selection.topicIds);
  const matches = registry.content.filter((card) => {
    if (selectedTopics.size > 0) {
      if (card.topicStableIds.some((id) => selectedTopics.has(id))) return true;
    }
    if (selection.topicGroupId) {
      return card.areaStableId === selection.topicGroupId;
    }
    return selectedTopics.size === 0;
  });

  const scoped = selection.goalIds.length
    ? // Drop the optional goal before dropping the topic (§8 expansion order).
      matches.filter((card) =>
        card.goalIds.some((id) => selection.goalIds.includes(id)),
      ).length > 0
      ? matches.filter((card) =>
          card.goalIds.some((id) => selection.goalIds.includes(id)),
        )
      : matches
    : matches;

  return scoped
    .slice()
    .sort((left, right) => {
      const leftTopic = left.topicStableIds.some((id) =>
        selectedTopics.has(id),
      );
      const rightTopic = right.topicStableIds.some((id) =>
        selectedTopics.has(id),
      );
      if (leftTopic !== rightTopic) return leftTopic ? -1 : 1;
      return left.order - right.order;
    })
    .slice(0, limit)
    .map((card) => ({
      card,
      reasons: reasonsFor(card, selection, {
        topics: topicLabels,
        goals: goalLabels,
      }),
    }));
}
