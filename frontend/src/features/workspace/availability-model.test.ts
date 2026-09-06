import { describe, expect, it } from "vitest";

import {
  emptyWeek,
  groupWorkingHours,
  isReasonClientVisible,
  newShift,
  validateWeek,
} from "./availability-model";

function rule(
  day: number,
  start: string,
  end: string,
  format = "online",
): {
  day_of_week: number;
  start_local_time: string;
  end_local_time: string;
  format: string;
} {
  return {
    day_of_week: day,
    start_local_time: start,
    end_local_time: end,
    format,
  };
}

describe("groupWorkingHours", () => {
  it("collapses days that share one interval into a single row", () => {
    const groups = groupWorkingHours([
      rule(0, "14:00:00", "20:00:00"),
      rule(2, "14:00:00", "20:00:00"),
      rule(1, "10:00:00", "16:00:00"),
      rule(3, "10:00:00", "16:00:00"),
      rule(4, "10:00:00", "14:00:00"),
    ]);

    expect(groups.map((group) => group.daysLabel)).toEqual([
      "Ponedeljak i Sreda",
      "Utorak i Četvrtak",
      "Petak",
    ]);
    expect(groups[0]?.timeLabel).toBe("14:00 — 20:00");
  });

  it("sorts rows by the first day of each group", () => {
    const groups = groupWorkingHours([
      rule(4, "10:00", "14:00"),
      rule(0, "14:00", "20:00"),
    ]);
    expect(groups[0]?.daysLabel).toBe("Ponedeljak");
  });

  it("prints times exactly as stored — they are local wall clock", () => {
    // Converting here would undo the point of storing local time (ADR-015 §2.7.3).
    const groups = groupWorkingHours([rule(0, "08:00:00", "12:00:00")]);
    expect(groups[0]?.timeLabel).toBe("08:00 — 12:00");
  });

  it("annotates the format only when the week actually mixes formats", () => {
    const single = groupWorkingHours([
      rule(0, "09:00", "13:00", "online"),
      rule(1, "09:00", "13:00", "online"),
    ]);
    expect(single.every((group) => group.formatLabel === null)).toBe(true);

    const mixed = groupWorkingHours([
      rule(0, "09:00", "13:00", "online"),
      rule(1, "09:00", "13:00", "in_person"),
    ]);
    expect(mixed.map((group) => group.formatLabel)).toEqual([
      "online",
      "uživo",
    ]);
  });

  it("returns nothing for a therapist with no rules", () => {
    expect(groupWorkingHours([])).toEqual([]);
  });
});

describe("validateWeek", () => {
  it("refuses an interval that ends before it starts", () => {
    const week = emptyWeek();
    week[0] = [newShift("14:00", "10:00")];
    expect(validateWeek(week)[0]).toMatch(/posle po/i);
  });

  it("refuses overlapping shifts on the same day", () => {
    const week = emptyWeek();
    week[0] = [newShift("09:00", "13:00"), newShift("12:00", "16:00")];
    expect(validateWeek(week)[0]).toMatch(/preklapaju/i);
  });

  it("accepts a split day that does not overlap", () => {
    const week = emptyWeek();
    week[0] = [newShift("09:00", "13:00"), newShift("16:00", "20:00")];
    expect(validateWeek(week)).toEqual({});
  });

  it("treats a day with no shifts as a valid non-working day", () => {
    expect(validateWeek(emptyWeek())).toEqual({});
  });
});

describe("isReasonClientVisible", () => {
  it("pre-checks the toggle for annual leave only", () => {
    // D-072: the reason seeds the default; the therapist still decides.
    expect(isReasonClientVisible("vacation")).toBe(true);
    expect(isReasonClientVisible("sick_leave")).toBe(false);
    expect(isReasonClientVisible(null)).toBe(false);
  });
});
