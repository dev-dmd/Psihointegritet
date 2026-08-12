"use client";

import { cn } from "@/helpers/cn";
import type { AvailabilityMode } from "@/lib/api/availability";

interface AvailabilitySettingsRowProps {
  mode: AvailabilityMode;
  modes: readonly AvailabilityMode[];
  modeLabels: Record<AvailabilityMode, string>;
  modeHint: string;
  step: number;
  leadHours: number;
  cancelHours: number;
  onModeChange: (mode: AvailabilityMode) => void;
  onStepChange: (step: number) => void;
  onLeadChange: (hours: number) => void;
  onCancelChange: (hours: number) => void;
  onOpenExceptions: () => void;
}

const stepOptions = [15, 30, 60];

/**
 * The three top cards: how time is offered, the two notice periods, and the
 * way into layer 3. The middle card is `coffee` on purpose — the notice
 * periods are the two values that silently decide what a client can book, so
 * they should not read as just another white card.
 */
export function AvailabilitySettingsRow({
  mode,
  modes,
  modeLabels,
  modeHint,
  step,
  leadHours,
  cancelHours,
  onModeChange,
  onStepChange,
  onLeadChange,
  onCancelChange,
  onOpenExceptions,
}: AvailabilitySettingsRowProps) {
  return (
    <div className="grid grid-cols-1 gap-3.5 lg:grid-cols-3">
      <div className="rounded-card border-line bg-surface border px-5 py-5">
        <div className="text-sage mb-3 text-[11.5px] font-semibold tracking-[0.14em] uppercase">
          Kako nudite vreme
        </div>
        <div
          role="radiogroup"
          aria-label="Način nuđenja termina"
          className="border-line grid grid-cols-3 gap-1 rounded-full border p-1"
        >
          {modes.map((candidate) => {
            const isActive = candidate === mode;
            return (
              <button
                key={candidate}
                type="button"
                role="radio"
                aria-checked={isActive}
                onClick={() => onModeChange(candidate)}
                className={cn(
                  "min-h-9 cursor-pointer rounded-full px-2 text-[12.5px] font-semibold transition-colors",
                  isActive
                    ? "bg-forest text-canvas"
                    : "text-ink-55 hover:text-coffee",
                )}
              >
                {modeLabels[candidate]}
              </button>
            );
          })}
        </div>
        <p className="text-ink-55 mt-2.5 text-[12.5px] leading-[1.5]">
          {modeHint}
        </p>
        {mode === "flexible_grid" ? (
          <label className="text-coffee mt-3 flex items-center gap-2 text-[12.5px] font-semibold">
            Korak
            <select
              value={step}
              onChange={(event) => onStepChange(Number(event.target.value))}
              className="border-line text-coffee min-h-9 rounded-lg border bg-transparent px-3 text-[13px] outline-none"
            >
              {stepOptions.map((value) => (
                <option key={value} value={value}>
                  {value} min
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </div>

      <div className="rounded-card border-coffee/25 bg-coffee text-canvas border px-5 py-5">
        <div className="text-canvas/70 mb-3 text-[11.5px] font-semibold tracking-[0.14em] uppercase">
          Rokovi
        </div>
        <label className="mb-3 flex flex-col gap-1 text-[12.5px] font-semibold">
          Zakazivanje najkasnije do
          <span className="flex items-center gap-2">
            <input
              type="number"
              min={0}
              max={720}
              value={leadHours}
              onChange={(event) => onLeadChange(Number(event.target.value))}
              className="border-canvas/30 text-canvas min-h-9 w-[92px] rounded-lg border bg-transparent px-3 text-[13.5px] outline-none"
            />
            <span className="text-canvas/70 font-normal">sati pre termina</span>
          </span>
        </label>
        <label className="flex flex-col gap-1 text-[12.5px] font-semibold">
          Otkazivanje najkasnije do
          <span className="flex items-center gap-2">
            <input
              type="number"
              min={0}
              max={720}
              value={cancelHours}
              onChange={(event) => onCancelChange(Number(event.target.value))}
              className="border-canvas/30 text-canvas min-h-9 w-[92px] rounded-lg border bg-transparent px-3 text-[13.5px] outline-none"
            />
            <span className="text-canvas/70 font-normal">sati pre termina</span>
          </span>
        </label>
        <p className="text-canvas/70 mt-3 text-[12.5px] leading-[1.5]">
          Važi samo za vas, ne za ceo tim. Konačna pravila otkazivanja još nisu
          potvrđena (S7).
        </p>
      </div>

      <div className="rounded-card border-line bg-surface flex flex-col justify-between border px-5 py-5">
        <div>
          <div className="text-sage mb-3 text-[11.5px] font-semibold tracking-[0.14em] uppercase">
            Neradni dani
          </div>
          <p className="text-coffee/80 text-[13px] leading-[1.6]">
            Godišnji odmor, praznik ili slobodan dan upišite unapred — kolege
            odmah vide da ne radite.
          </p>
        </div>
        <button
          type="button"
          onClick={onOpenExceptions}
          className="border-line text-coffee hover:border-sage mt-4 min-h-10 cursor-pointer self-start rounded-full border px-5 text-[13px] font-semibold transition-colors"
        >
          Podesi neradne dane
        </button>
      </div>
    </div>
  );
}
