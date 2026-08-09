"use client";

import { cn } from "@/helpers/cn";

import {
  newShift,
  weekdayLabels,
  weekTemplates,
  type Shift,
  type WeekShifts,
} from "../../availability-model";

interface AvailabilityWeekEditorProps {
  week: WeekShifts;
  errors: Record<number, string>;
  /** Which quick-fill was applied last, so the click has a visible answer. */
  appliedTemplateId: string | null;
  onApplyTemplate: (templateId: string) => void;
  onChange: (week: WeekShifts) => void;
}

/**
 * Layer 1 — working hours (ADR-015 v2 §2.7.2).
 *
 * A day with no shifts *is* a non-working day — the domain has no separate
 * flag. That was invisible in the first version: applying „Neradna nedelja" to
 * an already empty week changed nothing on screen, so the button looked
 * broken. Every day now carries an explicit Radni/Neradni switch, so the state
 * is stated rather than inferred from emptiness.
 *
 * Split and multi-part days need no special model either: they are simply more
 * than one shift on the same weekday, which §2.7.7 allows as long as they do
 * not overlap.
 *
 * Grid modes only. `manual_slots` has no recurring intervals — those starts are
 * entered in the Termini tab, so that mode never renders this editor.
 */
export function AvailabilityWeekEditor({
  week,
  errors,
  appliedTemplateId,
  onApplyTemplate,
  onChange,
}: AvailabilityWeekEditorProps) {
  const setDay = (day: number, shifts: Shift[]) => {
    onChange({ ...week, [day]: shifts });
  };

  const workingDays = weekdayLabels.filter(
    (_, day) => (week[day] ?? []).length > 0,
  ).length;

  return (
    <div className="flex flex-col gap-3.5">
      <div className="rounded-card border-line bg-surface border px-5 py-4">
        <div className="text-sage mb-3 text-[11.5px] font-semibold tracking-[0.14em] uppercase">
          Brzo popunjavanje
        </div>
        <div className="flex flex-wrap gap-2">
          {weekTemplates.map((template) => {
            const isApplied = template.id === appliedTemplateId;
            return (
              <button
                key={template.id}
                type="button"
                aria-pressed={isApplied}
                onClick={() => onApplyTemplate(template.id)}
                className={cn(
                  "min-h-9 cursor-pointer rounded-full border px-4 text-[13px] font-semibold transition-colors",
                  isApplied
                    ? "border-forest bg-forest text-canvas"
                    : "border-line text-coffee hover:border-sage",
                )}
              >
                {template.label}
              </button>
            );
          })}
        </div>
        <p className="text-ink-55 mt-2.5 text-[12.5px] leading-[1.5]">
          Popunjavanje zamenjuje trenutni raspored. Trenutno:{" "}
          <span className="text-coffee font-semibold">
            {workingDays === 0
              ? "nijedan radni dan"
              : `${String(workingDays)} radnih dana`}
          </span>
          . Snima se tek na „Sačuvaj”.
        </p>
      </div>

      {weekdayLabels.map((label, day) => {
        const shifts = week[day] ?? [];
        const error = errors[day];
        const isWorking = shifts.length > 0;

        return (
          <div
            key={label}
            className={cn(
              "rounded-card border px-5 py-4 transition-colors",
              isWorking
                ? "border-line bg-surface"
                : "border-line/60 bg-canvas/60",
            )}
          >
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <span
                className={cn(
                  "text-sm font-semibold",
                  isWorking ? "text-coffee" : "text-ink-55",
                )}
              >
                {label}
              </span>
              <div
                role="radiogroup"
                aria-label={`${label} — radni ili neradni dan`}
                className="border-line grid grid-cols-2 gap-1 rounded-full border p-1"
              >
                <button
                  type="button"
                  role="radio"
                  aria-checked={isWorking}
                  onClick={() => {
                    if (!isWorking) setDay(day, [newShift()]);
                  }}
                  className={cn(
                    "min-h-8 cursor-pointer rounded-full px-3 text-[12px] font-semibold transition-colors",
                    isWorking
                      ? "bg-forest text-canvas"
                      : "text-ink-55 hover:text-coffee",
                  )}
                >
                  Radni
                </button>
                <button
                  type="button"
                  role="radio"
                  aria-checked={!isWorking}
                  onClick={() => setDay(day, [])}
                  className={cn(
                    "min-h-8 cursor-pointer rounded-full px-3 text-[12px] font-semibold transition-colors",
                    isWorking
                      ? "text-ink-55 hover:text-coffee"
                      : "bg-coffee text-canvas",
                  )}
                >
                  Neradni
                </button>
              </div>
            </div>

            {isWorking ? (
              <>
                <div className="flex flex-col gap-2">
                  {shifts.map((shift, index) => (
                    <div
                      key={shift.key}
                      className="flex flex-wrap items-center gap-2"
                    >
                      <span className="text-ink-55 w-[86px] text-[12.5px] font-semibold">
                        {`${String(index + 1)}. smena`}
                      </span>
                      <label className="sr-only" htmlFor={`${shift.key}-start`}>
                        {`${label} — početak`}
                      </label>
                      <input
                        id={`${shift.key}-start`}
                        type="time"
                        value={shift.start}
                        onChange={(event) =>
                          setDay(
                            day,
                            shifts.map((candidate) =>
                              candidate.key === shift.key
                                ? { ...candidate, start: event.target.value }
                                : candidate,
                            ),
                          )
                        }
                        className="border-line text-coffee focus:border-sage min-h-9 rounded-lg border bg-transparent px-3 text-[13.5px] outline-none"
                      />
                      <span aria-hidden className="text-ink-55">
                        –
                      </span>
                      <label className="sr-only" htmlFor={`${shift.key}-end`}>
                        {`${label} — kraj`}
                      </label>
                      <input
                        id={`${shift.key}-end`}
                        type="time"
                        value={shift.end}
                        onChange={(event) =>
                          setDay(
                            day,
                            shifts.map((candidate) =>
                              candidate.key === shift.key
                                ? { ...candidate, end: event.target.value }
                                : candidate,
                            ),
                          )
                        }
                        className="border-line text-coffee focus:border-sage min-h-9 rounded-lg border bg-transparent px-3 text-[13.5px] outline-none"
                      />
                      <button
                        type="button"
                        aria-label={`Obriši smenu ${String(index + 1)} — ${label}`}
                        onClick={() =>
                          setDay(
                            day,
                            shifts.filter(
                              (candidate) => candidate.key !== shift.key,
                            ),
                          )
                        }
                        className="text-badge-danger hover:border-badge-danger/50 border-line min-h-9 cursor-pointer rounded-lg border px-3 text-[12.5px] font-semibold transition-colors"
                      >
                        Obriši
                      </button>
                    </div>
                  ))}
                </div>

                {error ? (
                  <p className="text-badge-danger mt-2 text-[12.5px] font-semibold">
                    {error}
                  </p>
                ) : null}

                <button
                  type="button"
                  onClick={() => setDay(day, [...shifts, newShift()])}
                  className="border-line text-coffee hover:border-sage mt-3 min-h-9 cursor-pointer rounded-full border border-dashed px-4 text-[12.5px] font-semibold transition-colors"
                >
                  + smena
                </button>
              </>
            ) : (
              <p className="text-ink-55 text-[12.5px]">
                Neradni dan — klijenti ne vide nijedan termin.
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
