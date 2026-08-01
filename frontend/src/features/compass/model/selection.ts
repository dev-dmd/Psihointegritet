export const COMPASS_MAX_TOPIC_SELECTIONS = 2;

export const COMPASS_JOURNEY_INTENTS = [
  "explore",
  "professional_support",
  "both",
] as const;

export type CompassJourneyIntent = (typeof COMPASS_JOURNEY_INTENTS)[number];

/**
 * Local, non-clinical discovery input. It intentionally contains no free text,
 * contact data, risk assessment, therapist reference, or recommendation score.
 */
export interface CompassSelection {
  topicGroupId: string | null;
  topicIds: string[];
  audienceIds: string[];
  goalIds: string[];
  journeyIntent: CompassJourneyIntent | null;
}

export const EMPTY_COMPASS_SELECTION: CompassSelection = {
  topicGroupId: null,
  topicIds: [],
  audienceIds: [],
  goalIds: [],
  journeyIntent: null,
};

export type CompassSelectionAction =
  | { type: "select-topic-group"; topicGroupId: string | null }
  | { type: "toggle-topic"; topicId: string }
  | { type: "select-audience"; audienceId: string | null }
  | { type: "select-goal"; goalId: string | null }
  | { type: "select-journey"; journeyIntent: CompassJourneyIntent | null }
  | { type: "reset" };

function toggleBoundedId(
  ids: readonly string[],
  id: string,
  maximum: number,
): string[] {
  if (ids.includes(id)) return ids.filter((candidate) => candidate !== id);
  if (ids.length >= maximum) return [...ids];
  return [...ids, id];
}

/**
 * Pure state transition boundary for the future visual implementation. Topic
 * selection is the only multi-select control in v1 and is capped at two.
 */
export function compassSelectionReducer(
  selection: CompassSelection,
  action: CompassSelectionAction,
): CompassSelection {
  switch (action.type) {
    case "select-topic-group":
      return {
        ...selection,
        topicGroupId: action.topicGroupId,
        topicIds:
          selection.topicGroupId === action.topicGroupId
            ? selection.topicIds
            : [],
      };
    case "toggle-topic":
      return {
        ...selection,
        topicIds: toggleBoundedId(
          selection.topicIds,
          action.topicId,
          COMPASS_MAX_TOPIC_SELECTIONS,
        ),
      };
    case "select-audience":
      return {
        ...selection,
        audienceIds: action.audienceId ? [action.audienceId] : [],
      };
    case "select-goal":
      return { ...selection, goalIds: action.goalId ? [action.goalId] : [] };
    case "select-journey":
      return { ...selection, journeyIntent: action.journeyIntent };
    case "reset":
      return { ...EMPTY_COMPASS_SELECTION };
  }
}

export function hasCompassSelection(selection: CompassSelection): boolean {
  return Boolean(
    selection.topicGroupId ||
    selection.topicIds.length > 0 ||
    selection.audienceIds.length > 0 ||
    selection.goalIds.length > 0 ||
    selection.journeyIntent,
  );
}
