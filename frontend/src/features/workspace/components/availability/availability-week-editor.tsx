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
  /** Manual mode lists explicit starts; grid modes list from–to shifts. */
  manualMode: boolean;
  onChange: (week: WeekShifts) => void;
}

/**
 * Layer 1 — working hours (ADR-015 v2 §2.7.2).
 *
 * Split and multi-part days need no special model: they are simply more than
 * one shift on the same weekday, which §2.7.7 already allows as long as they
 * do not overlap.
 */
export function AvailabilityWeekEditor({
  week,
  errors,
  manualMode,
  onChange,
}: AvailabilityWeekEditorProps) {
  const setDay = (day: number, shifts: Shift[]) => {
    onChange({ ...week, [day]: shifts });
  };

  return (
    <div className="flex flex-col gap-3.5">
      <div className="rounded-card border-line bg-surface border px-5 py-4">
        <div className="text-sage mb-3 text-[11.5px] font-semibold tracking-[0.14em] uppercase">
          Brzo popunjavanje
        </div>
        <div className="flex flex-wrap gap-2">
          {weekTemplates.map((template) => (
            <button
              key={template.id}
              type="button"
              onClick={() => onChange(template.build())}
              className="border-line text-coffee hover:border-sage min-h-9 cursor-pointer rounded-full border px-4 text-[13px] font-semibold transition-colors"
            >
              {template.label}
            </button>
          ))}
        </div>
        <p className="text-ink-55 mt-2.5 text-[12.5px] leading-[1.5]">
          Popunjavanje zamenjuje trenutni raspored — snima se tek kad pritisnete
          „Sačuvaj”.
        </p>
      </div>

      {weekdayLabels.map((label, day) => {
        const shifts = week[day] ?? [];
        const error = errors[day];
        return (
          <div
            key={label}
            className={cn(
              "rounded-card border px-5 py-4",
              shifts.length > 0
                ? "border-line bg-surface"
                : "border-line/70 bg-canvas",
            )}
          >
            <div className="mb-3 flex items-center justify-between gap-3">
              <span className="text-coffee text-sm font-semibold">{label}</span>
              <span className="text-ink-55 text-[12.5px] font-semibold">
                {shifts.length === 0
                  ? "Neradni dan"
                  : manualMode
                    ? `${String(shifts.length)} termin(a)`
                    : `${String(shifts.length)} smena`}
              </span>
            </div>

            <div className="flex flex-col gap-2">
              {shifts.map((shift, index) => (
                <div
                  key={shift.key}
                  className="flex flex-wrap items-center gap-2"
                >
                  <span className="text-ink-55 w-[86px] text-[12.5px] font-semibold">
                    {manualMode
                      ? `${String(index + 1)}. termin`
                      : `${String(index + 1)}. smena`}
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
                  {manualMode ? null : (
                    <>
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
                    </>
                  )}
                  <button
                    type="button"
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
              onClick={() =>
                setDay(day, [
                  ...shifts,
                  manualMode ? newShift("09:00", "09:00") : newShift(),
                ])
              }
              className="border-line text-coffee hover:border-sage mt-3 min-h-9 cursor-pointer rounded-full border border-dashed px-4 text-[12.5px] font-semibold transition-colors"
            >
              {manualMode ? "+ termin" : "+ smena"}
            </button>
          </div>
        );
      })}
    </div>
  );
}
