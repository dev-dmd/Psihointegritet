import type {
  AvailabilityMode,
  AvailabilityRule,
} from "@/lib/api/availability";

/** Monday-first, matching `AvailabilityRule.day_of_week` (0 = Monday). */
export const weekdayLabels = [
  "Ponedeljak",
  "Utorak",
  "Sreda",
  "Četvrtak",
  "Petak",
  "Subota",
  "Nedelja",
] as const;

export const availabilityModeLabels: Record<AvailabilityMode, string> = {
  hourly_grid: "Puni sat",
  flexible_grid: "Fleksibilno",
  manual_slots: "Ručni termini",
};

export const availabilityModeHints: Record<AvailabilityMode, string> = {
  hourly_grid: "Termini kreću u pun sat: 08, 09, 10…",
  flexible_grid: "Termini kreću na 15, 30 ili 60 minuta.",
  manual_slots: "Bez mreže — sami upisujete svaki početak.",
};

/**
 * Reasons a therapist can give for a non-working period.
 *
 * `clientVisible` is the whole point of the list: the team may see why a
 * colleague is away, but a client is only ever told about annual leave (CTO,
 * 2026-08-09). Anything else reaches the public side as plain unavailability
 * with no reason attached — a health or family matter must not leak through a
 * dropdown.
 *
 * Client-facing endpoints do not expose exceptions at all yet; when one is
 * added, this flag has to be enforced on the backend, not here.
 */
export interface ExceptionReason {
  code: string;
  label: string;
  clientVisible: boolean;
}

export const exceptionReasons: ExceptionReason[] = [
  { code: "vacation", label: "Godišnji odmor", clientVisible: true },
  { code: "holiday", label: "Praznik", clientVisible: false },
  { code: "slava", label: "Slava", clientVisible: false },
  { code: "education", label: "Edukacija / supervizija", clientVisible: false },
  { code: "sick_leave", label: "Odsustvo", clientVisible: false },
  { code: "other", label: "Drugo", clientVisible: false },
];

export function reasonLabel(code: string | null): string {
  if (code === null) return "Bez razloga";
  return exceptionReasons.find((r) => r.code === code)?.label ?? code;
}

export function isReasonClientVisible(code: string | null): boolean {
  if (code === null) return false;
  return exceptionReasons.find((r) => r.code === code)?.clientVisible ?? false;
}

// ── Shifts ──────────────────────────────────────────────────────────────────

/**
 * One working block on one weekday. Split and multi-part days are simply more
 * than one shift on the same weekday — ADR-015 §2.7.7 already allows several
 * non-overlapping rules per profile and weekday, so no new model is needed.
 */
export interface Shift {
  /** Client-side identity; a saved shift also carries `ruleId`. */
  key: string;
  ruleId: string | null;
  start: string;
  end: string;
}

export type WeekShifts = Record<number, Shift[]>;

export function emptyWeek(): WeekShifts {
  return { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };
}

let shiftCounter = 0;
export function newShift(start = "09:00", end = "17:00"): Shift {
  shiftCounter += 1;
  return { key: `s${String(shiftCounter)}`, ruleId: null, start, end };
}

/** Backend times arrive as `HH:MM:SS`; the inputs speak `HH:MM`. */
export function toInputTime(value: string): string {
  return value.slice(0, 5);
}

export function weekFromRules(rules: AvailabilityRule[]): WeekShifts {
  const week = emptyWeek();
  for (const rule of rules) {
    const day = week[rule.day_of_week];
    if (!day) continue;
    shiftCounter += 1;
    day.push({
      key: `r${rule.id}`,
      ruleId: rule.id,
      start: toInputTime(rule.start_local_time),
      end: toInputTime(rule.end_local_time),
    });
  }
  for (const day of Object.values(week)) {
    day.sort((left, right) => left.start.localeCompare(right.start));
  }
  return week;
}

// ── Prefill templates ───────────────────────────────────────────────────────

export interface WeekTemplate {
  id: string;
  label: string;
  build: () => WeekShifts;
}

function fill(days: number[], start: string, end: string): WeekShifts {
  const week = emptyWeek();
  for (const day of days) week[day] = [newShift(start, end)];
  return week;
}

export const weekTemplates: WeekTemplate[] = [
  {
    id: "workweek",
    label: "Radna nedelja (pon–pet)",
    build: () => fill([0, 1, 2, 3, 4], "09:00", "17:00"),
  },
  {
    id: "full-week",
    label: "Cela nedelja (sa vikendom)",
    build: () => fill([0, 1, 2, 3, 4, 5, 6], "09:00", "17:00"),
  },
  {
    id: "split",
    label: "Dvokratno (pon–pet)",
    build: () => {
      const week = emptyWeek();
      for (const day of [0, 1, 2, 3, 4]) {
        week[day] = [newShift("09:00", "13:00"), newShift("16:00", "20:00")];
      }
      return week;
    },
  },
  { id: "closed", label: "Neradna nedelja", build: emptyWeek },
];

// ── Validation ──────────────────────────────────────────────────────────────

/**
 * Refuses what the database would refuse anyway — `ck_avail_rule_time_range`
 * and the non-overlap invariant (§2.7.7) — so the person sees the problem
 * beside the field instead of as a failed save.
 */
export function validateWeek(week: WeekShifts): Record<number, string> {
  const errors: Record<number, string> = {};
  for (const [dayKey, shifts] of Object.entries(week)) {
    const day = Number(dayKey);
    const sorted = [...shifts].sort((l, r) => l.start.localeCompare(r.start));
    for (const shift of sorted) {
      if (shift.end <= shift.start) {
        errors[day] = "Kraj smene mora biti posle početka.";
        break;
      }
    }
    if (errors[day]) continue;
    for (let index = 1; index < sorted.length; index += 1) {
      const previous = sorted[index - 1];
      const current = sorted[index];
      if (previous && current && current.start < previous.end) {
        errors[day] = "Smene se preklapaju.";
        break;
      }
    }
  }
  return errors;
}
