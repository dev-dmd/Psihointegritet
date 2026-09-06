"use client";

import { useMemo, useState } from "react";

import { formatDateSr } from "@/helpers/format-date";

import { weekdayLabels } from "../../availability-model";
import {
  useCopyWeek,
  useCreateManualSlot,
  useDeleteManualSlot,
  useGenerateWeek,
  useManualSlots,
} from "../../hooks/use-availability";

interface AvailabilitySlotsProps {
  profileId: string | null;
  /** `manual_slots` has no rules to generate from — starts are typed here. */
  manualMode?: boolean;
}

/** Monday of the week containing `date`, as `YYYY-MM-DD`. */
function mondayOf(date: Date): string {
  const monday = new Date(date);
  monday.setHours(12, 0, 0, 0);
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  return monday.toISOString().slice(0, 10);
}

function addDays(iso: string, days: number): string {
  const date = new Date(`${iso}T12:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

/** „2026-08-11" + „09:00" → UTC instant, using the browser's local offset. */
function localInstant(day: string, time: string): string {
  const [year, month, date] = day.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  return new Date(
    year ?? 0,
    (month ?? 1) - 1,
    date ?? 1,
    hour ?? 0,
    minute ?? 0,
  ).toISOString();
}

const sourceLabels: Record<string, string> = {
  manual: "ručno",
  weekly_generator: "generisano",
  copied_week: "kopirano",
};

/**
 * Layer 2 — the slots that actually exist, materialised from layer 1.
 *
 * Generating a week turns recurring rules into explicit starts so single
 * appointments can be removed without touching the working hours behind them.
 */
export function AvailabilitySlots({
  profileId,
  manualMode = false,
}: AvailabilitySlotsProps) {
  const [weekStart, setWeekStart] = useState(() => mondayOf(new Date()));
  const weekEnd = addDays(weekStart, 6);
  const [newDate, setNewDate] = useState(weekStart);
  const [newTime, setNewTime] = useState("09:00");

  const slots = useManualSlots(profileId, weekStart, weekEnd);
  const generate = useGenerateWeek(profileId);
  const copy = useCopyWeek(profileId);
  const remove = useDeleteManualSlot();
  const addSlot = useCreateManualSlot();

  const byDay = useMemo(() => {
    const grouped: Record<
      number,
      { id: string; time: string; source: string }[]
    > = { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };
    for (const slot of slots.data ?? []) {
      const date = new Date(slot.starts_at);
      const day = (date.getDay() + 6) % 7;
      grouped[day]?.push({
        id: slot.id,
        time: date.toTimeString().slice(0, 5),
        source: slot.source,
      });
    }
    for (const list of Object.values(grouped)) {
      list.sort((left, right) => left.time.localeCompare(right.time));
    }
    return grouped;
  }, [slots.data]);

  if (profileId === null) {
    // A slot is attached to a profile, so the profile has to exist first — but
    // in manual mode there is no working time to enter, only the settings.
    return (
      <div className="rounded-card border-warm/45 bg-warm/20 text-coffee border px-5 py-4 text-[13.5px] leading-[1.6]">
        {manualMode
          ? "Najpre sačuvajte podešavanja u tabu „Radno vreme” — termini se vezuju za vaš raspored."
          : "Najpre sačuvajte radno vreme — termini nastaju iz njega."}
      </div>
    );
  }

  const isBusy = generate.isPending || copy.isPending;

  return (
    <div className="flex flex-col gap-3.5">
      <div className="rounded-card border-forest/25 bg-forest text-canvas border px-5 py-5">
        <div className="text-canvas/70 mb-3 text-[11.5px] font-semibold tracking-[0.14em] uppercase">
          Nedelja
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-[12.5px] font-semibold">
            Počinje u ponedeljak
            <input
              type="date"
              value={weekStart}
              onChange={(event) =>
                setWeekStart(
                  mondayOf(new Date(`${event.target.value}T12:00:00`)),
                )
              }
              className="border-canvas/30 text-canvas min-h-9 rounded-lg border bg-transparent px-3 text-[13.5px] outline-none"
            />
          </label>
          {manualMode ? null : (
            <button
              type="button"
              onClick={() => generate.mutate(weekStart)}
              disabled={isBusy}
              className="bg-canvas text-forest min-h-11 cursor-pointer rounded-full px-5 text-[13px] font-semibold disabled:cursor-not-allowed disabled:opacity-50"
            >
              {generate.isPending ? "Generišem…" : "Generiši iz radnog vremena"}
            </button>
          )}
          <button
            type="button"
            onClick={() =>
              copy.mutate({ from: addDays(weekStart, -7), to: weekStart })
            }
            disabled={isBusy}
            className="border-canvas/40 text-canvas min-h-11 cursor-pointer rounded-full border px-5 text-[13px] font-semibold disabled:cursor-not-allowed disabled:opacity-50"
          >
            {copy.isPending ? "Kopiram…" : "Kopiraj prošlu nedelju"}
          </button>
        </div>
        <p className="text-canvas/70 mt-3 text-[12.5px] leading-[1.5]">
          {formatDateSr(weekStart)} – {formatDateSr(weekEnd)}.{" "}
          {manualMode
            ? "Svaki termin upisujete sami; kopiranje prenosi prošlu nedelju."
            : "Generisanje dodaje termine; postojeći se ne brišu."}
        </p>
      </div>

      {/* Explicit start — the only way to offer time in `manual_slots`, and a
          useful addition on top of a generated week in the grid modes. */}
      <div className="rounded-card border-line bg-surface border px-5 py-4">
        <div className="text-sage mb-3 text-[11.5px] font-semibold tracking-[0.14em] uppercase">
          Dodaj termin
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-[12.5px] font-semibold">
            Datum
            <input
              type="date"
              value={newDate}
              min={weekStart}
              max={weekEnd}
              onChange={(event) => setNewDate(event.target.value)}
              className="border-line text-coffee min-h-11 rounded-lg border bg-transparent px-3 text-[13.5px] outline-none"
            />
          </label>
          <label className="flex flex-col gap-1 text-[12.5px] font-semibold">
            Vreme
            <input
              type="time"
              value={newTime}
              onChange={(event) => setNewTime(event.target.value)}
              className="border-line text-coffee min-h-11 rounded-lg border bg-transparent px-3 text-[13.5px] outline-none"
            />
          </label>
          <button
            type="button"
            onClick={() =>
              addSlot.mutate({
                availability_profile_id: profileId,
                // Local wall clock in, UTC instant out — the same rule the
                // rest of the availability layer follows.
                starts_at: localInstant(newDate, newTime),
                format: "online",
              })
            }
            disabled={addSlot.isPending}
            className="bg-forest text-canvas hover:bg-forest-hover min-h-11 cursor-pointer rounded-full px-5 text-[13px] font-semibold disabled:cursor-not-allowed disabled:opacity-50"
          >
            {addSlot.isPending ? "Dodajem…" : "+ Dodaj termin"}
          </button>
        </div>
        {addSlot.isError ? (
          <p className="text-badge-danger mt-2 text-[12.5px] font-semibold">
            Termin nije mogao da se doda.
          </p>
        ) : null}
      </div>

      {slots.isError ? (
        <p className="text-badge-danger text-[13px] font-semibold">
          Termini nisu mogli da se učitaju.
        </p>
      ) : null}

      <div className="grid grid-cols-1 gap-3.5 lg:grid-cols-2">
        {weekdayLabels.map((label, day) => {
          const list = byDay[day] ?? [];
          return (
            <div
              key={label}
              className="rounded-card border-line bg-surface border px-5 py-4"
            >
              <div className="mb-2.5 flex items-center justify-between gap-3">
                <span className="text-coffee text-sm font-semibold">
                  {label}
                </span>
                <span className="text-ink-55 text-[12.5px] font-semibold">
                  {formatDateSr(addDays(weekStart, day))}
                </span>
              </div>
              {list.length === 0 ? (
                <p className="text-ink-55 text-[12.5px]">Nema termina.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {list.map((slot) => (
                    <button
                      key={slot.id}
                      type="button"
                      onClick={() => remove.mutate(slot.id)}
                      title={`Obriši termin u ${slot.time} (${sourceLabels[slot.source] ?? slot.source})`}
                      className="border-line text-coffee hover:border-badge-danger hover:text-badge-danger min-h-9 cursor-pointer rounded-full border px-3.5 text-[12.5px] font-semibold transition-colors"
                    >
                      {slot.time}
                      <span className="ml-1.5 opacity-60">×</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
