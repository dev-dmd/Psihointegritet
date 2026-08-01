import { describe, expect, it } from "vitest";

import {
  EMPTY_COMPASS_SELECTION,
  compassSelectionReducer,
  hasCompassSelection,
} from "./selection";

describe("compass selection", () => {
  it("keeps at most two topics and allows an explicit removal", () => {
    const first = compassSelectionReducer(EMPTY_COMPASS_SELECTION, {
      type: "toggle-topic",
      topicId: "burnout",
    });
    const second = compassSelectionReducer(first, {
      type: "toggle-topic",
      topicId: "nesanica",
    });
    const capped = compassSelectionReducer(second, {
      type: "toggle-topic",
      topicId: "anksioznost",
    });
    const removed = compassSelectionReducer(capped, {
      type: "toggle-topic",
      topicId: "burnout",
    });

    expect(capped.topicIds).toEqual(["burnout", "nesanica"]);
    expect(removed.topicIds).toEqual(["nesanica"]);
  });

  it("keeps audience and goal as single-select signals", () => {
    const withAudience = compassSelectionReducer(EMPTY_COMPASS_SELECTION, {
      type: "select-audience",
      audienceId: "self",
    });
    const replacedAudience = compassSelectionReducer(withAudience, {
      type: "select-audience",
      audienceId: "parent",
    });
    const withGoal = compassSelectionReducer(replacedAudience, {
      type: "select-goal",
      goalId: "understand",
    });

    expect(withGoal.audienceIds).toEqual(["parent"]);
    expect(withGoal.goalIds).toEqual(["understand"]);
    expect(hasCompassSelection(withGoal)).toBe(true);
    expect(compassSelectionReducer(withGoal, { type: "reset" })).toEqual(
      EMPTY_COMPASS_SELECTION,
    );
  });

  it("clears topic selections when the parent area changes", () => {
    const changed = compassSelectionReducer(
      {
        ...EMPTY_COMPASS_SELECTION,
        topicGroupId: "stress-overload",
        topicIds: ["burnout"],
      },
      { type: "select-topic-group", topicGroupId: "relationships" },
    );

    expect(changed.topicGroupId).toBe("relationships");
    expect(changed.topicIds).toEqual([]);
  });
});
