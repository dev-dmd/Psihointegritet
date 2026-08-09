"use client";

import { useMemo, useState } from "react";

import { TabPills } from "@/components/panel/tab-pills";
import { cn } from "@/helpers/cn";
import {
  availabilityModes,
  type AvailabilityMode,
} from "@/lib/api/availability";

import {
  availabilityModeHints,
  availabilityModeLabels,
  emptyWeek,
  validateWeek,
  weekFromRules,
  type WeekShifts,
} from "../../availability-model";
import {
  useAvailabilityProfiles,
  useAvailabilityRules,
  useCreateAvailabilityRule,
  useDeleteAvailabilityRule,
  useMyTherapistProfile,
  useSaveAvailabilityProfile,
} from "../../hooks/use-availability";
import { PageHeader } from "../page-header";
import { AvailabilityExceptions } from "./availability-exceptions";
import { AvailabilitySettingsRow } from "./availability-settings-row";
import { AvailabilityWeekEditor } from "./availability-week-editor";

const layerTabs = [
  { id: "radno-vreme", label: "1 · Radno vreme" },
  { id: "izuzeci", label: "3 · Izuzeci" },
];

/**
 * Layers 1 and 3 of the four-layer availability model (design handoff §8.1).
 *
 * Layer 2 (generated slots) and layer 4 (company capacity) stay read-only
 * explainer cards on the profile overview until their own passes.
 */
export function ScreenDostupnost() {
  const [layer, setLayer] = useState("radno-vreme");
  const me = useMyTherapistProfile();
  const therapistId = me.data?.id ?? null;

  const profiles = useAvailabilityProfiles(therapistId);
  const profile = profiles.data?.[0] ?? null;
  const rules = useAvailabilityRules(profile?.id ?? null);

  const [mode, setMode] = useState<AvailabilityMode>("hourly_grid");
  const [step, setStep] = useState(60);
  const [leadHours, setLeadHours] = useState(24);
  const [cancelHours, setCancelHours] = useState(24);
  const [week, setWeek] = useState<WeekShifts>(emptyWeek);
  const [saved, setSaved] = useState(false);
  const [syncedProfileId, setSyncedProfileId] = useState<string | null>(null);

  // Seed the form from the server exactly once per profile, adjusting state
  // during render rather than in an effect. A refetch must not overwrite edits
  // the therapist has made but not yet saved.
  if (profile && rules.data && syncedProfileId !== profile.id) {
    setSyncedProfileId(profile.id);
    setMode(profile.mode as AvailabilityMode);
    setStep(profile.start_step_minutes ?? 60);
    setLeadHours(profile.min_lead_time_hours);
    setCancelHours(profile.cancellation_notice_hours);
    setWeek(weekFromRules(rules.data));
  }

  const errors = useMemo(() => validateWeek(week), [week]);
  const hasErrors = Object.keys(errors).length > 0;

  const saveProfile = useSaveAvailabilityProfile(therapistId);
  const createRule = useCreateAvailabilityRule(profile?.id ?? null);
  const deleteRule = useDeleteAvailabilityRule(profile?.id ?? null);

  const isBusy =
    saveProfile.isPending || createRule.isPending || deleteRule.isPending;

  const save = async () => {
    if (therapistId === null || hasErrors) return;
    setSaved(false);

    const savedProfile = await saveProfile.mutateAsync({
      profileId: profile?.id ?? null,
      payload: {
        therapist_profile_id: therapistId,
        mode,
        timezone: profile?.timezone ?? "Europe/Belgrade",
        start_step_minutes: mode === "manual_slots" ? null : step,
        min_lead_time_hours: leadHours,
        cancellation_notice_hours: cancelHours,
        enabled: true,
      },
    });

    // Rules have no bulk endpoint yet: replace what changed, leave the rest.
    const existing = rules.data ?? [];
    for (const rule of existing) {
      await deleteRule.mutateAsync(rule.id);
    }
    const today = new Date().toISOString().slice(0, 10);
    for (const [dayKey, shifts] of Object.entries(week)) {
      for (const shift of shifts) {
        await createRule.mutateAsync({
          availability_profile_id: savedProfile.id,
          day_of_week: Number(dayKey),
          start_local_time: shift.start,
          end_local_time: mode === "manual_slots" ? shift.start : shift.end,
          valid_from: today,
          format: "online",
        });
      }
    }
    setSaved(true);
  };

  if (me.isPending) {
    return <p className="text-ink-55 text-[13px]">Učitavanje…</p>;
  }

  if (therapistId === null) {
    return (
      <section className="animate-fade-up">
        <PageHeader
          title="Dostupnost"
          description="Radno vreme, izuzeci i generisani slotovi."
        />
        <div className="rounded-card border-warm/45 bg-warm/20 text-coffee border px-5 py-4 text-[13.5px] leading-[1.6]">
          Ovaj nalog nije povezan ni sa jednim terapeutskim profilom, pa nema
          raspored koji bi se uređivao. Administrator to povezuje u registru
          terapeuta.
        </div>
      </section>
    );
  }

  const saveButton = (
    <button
      type="button"
      onClick={() => void save()}
      disabled={isBusy || hasErrors}
      className="bg-forest text-canvas hover:bg-forest-hover min-h-10 cursor-pointer rounded-full px-6 text-[13.5px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50"
    >
      {isBusy ? "Čuvam…" : "Sačuvaj"}
    </button>
  );

  return (
    <section className="animate-fade-up">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <PageHeader
          title="Dostupnost"
          description={`Raspored za ${me.data?.display_name ?? ""}. Raspoloživost nije isto što i termin.`}
        />
        {layer === "radno-vreme" ? saveButton : null}
      </div>

      <TabPills
        tabs={layerTabs}
        activeId={layer}
        onChange={setLayer}
        className="mb-5"
      />

      {layer === "radno-vreme" ? (
        <div className="flex flex-col gap-3.5">
          <AvailabilitySettingsRow
            mode={mode}
            modes={availabilityModes}
            modeLabels={availabilityModeLabels}
            modeHint={availabilityModeHints[mode]}
            step={step}
            leadHours={leadHours}
            cancelHours={cancelHours}
            onModeChange={setMode}
            onStepChange={setStep}
            onLeadChange={setLeadHours}
            onCancelChange={setCancelHours}
            onOpenExceptions={() => setLayer("izuzeci")}
          />

          {rules.isPending && profile ? (
            <p className="text-ink-55 text-[13px]">Učitavanje rasporeda…</p>
          ) : (
            <AvailabilityWeekEditor
              week={week}
              errors={errors}
              manualMode={mode === "manual_slots"}
              onChange={setWeek}
            />
          )}

          <div
            className={cn(
              "rounded-card border-line bg-surface flex flex-wrap items-center justify-between gap-3 border px-5 py-4",
            )}
          >
            <span className="text-ink-55 text-[12.5px]">
              {hasErrors
                ? "Ispravite označene dane pre čuvanja."
                : saved
                  ? "Raspored je sačuvan."
                  : "Promene se čuvaju tek na „Sačuvaj”."}
            </span>
            {saveButton}
          </div>
        </div>
      ) : (
        <AvailabilityExceptions therapistProfileId={therapistId} />
      )}
    </section>
  );
}
