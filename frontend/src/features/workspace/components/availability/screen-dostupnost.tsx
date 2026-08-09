"use client";

import type { Route } from "next";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo, useState } from "react";

import { StatusBadge } from "@/components/panel/status-badge";
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
  weekTemplates,
  type WeekShifts,
} from "../../availability-model";
import {
  useAvailabilityProfiles,
  useAvailabilityRules,
  useAvailabilityTherapists,
  useMyTherapistProfile,
  useReplaceAvailabilityRules,
  useSaveAvailabilityProfile,
} from "../../hooks/use-availability";
import { PageHeader } from "../page-header";
import { AvailabilityExceptions } from "./availability-exceptions";
import { AvailabilitySettingsRow } from "./availability-settings-row";
import { AvailabilitySlots } from "./availability-slots";
import { AvailabilityWeekEditor } from "./availability-week-editor";

const layerTabs = [
  { id: "radno-vreme", label: "1 · Radno vreme" },
  { id: "slotovi", label: "2 · Termini" },
  { id: "izuzeci", label: "3 · Izuzeci" },
] as const;

type LayerTab = (typeof layerTabs)[number]["id"];

function isLayerTab(value: string | null): value is LayerTab {
  return layerTabs.some((tab) => tab.id === value);
}

/**
 * Layers 1 and 3 of the four-layer availability model (design handoff §8.1).
 *
 * Layer 2 (generated slots) and layer 4 (company capacity) stay read-only
 * explainer cards on the profile overview until their own passes.
 */
export function ScreenDostupnost({
  initialTab = null,
}: {
  initialTab?: string | null;
} = {}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [layer, setLayer] = useState<LayerTab>(
    isLayerTab(initialTab) ? initialTab : "radno-vreme",
  );

  // Keep the tab in the URL, not just in state: §2 wants a link to open one
  // layer directly and the choice to survive a refresh. `replace` so the back
  // button leaves the screen rather than walking the tabs.
  const openLayer = useCallback(
    (next: string) => {
      if (!isLayerTab(next)) return;
      setLayer(next);
      const params = new URLSearchParams(searchParams.toString());
      params.set("tab", next);
      router.replace(`${pathname}?${params.toString()}` as Route, {
        scroll: false,
      });
    },
    [pathname, router, searchParams],
  );
  const me = useMyTherapistProfile();
  const therapists = useAvailabilityTherapists();

  // A superadmin outside production may work on someone else's schedule, so the
  // chosen therapist — not the signed-in account — decides what is edited.
  const [pickedId, setPickedId] = useState<string | null>(null);
  const therapistId = pickedId ?? me.data?.id ?? null;
  const isStandIn = me.data?.acting_as === true;

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
  const [appliedTemplateId, setAppliedTemplateId] = useState<string | null>(
    null,
  );

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
  const replaceRules = useReplaceAvailabilityRules(profile?.id ?? null);

  const isBusy = saveProfile.isPending || replaceRules.isPending;

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

    // One transaction replaces the whole week. The previous flow deleted each
    // rule then re-created it, so a failure halfway through left the therapist
    // with half a schedule.
    // `manual_slots` has no recurring intervals at all — the therapist enters
    // explicit starts in the Termini tab, and `get_available_slots` reads
    // `manual_availability_slots` there, never rules. Writing a rule with
    // `end == start` would also fail `ck_avail_rule_time_range`.
    if (mode !== "manual_slots") {
      const today = new Date().toISOString().slice(0, 10);
      await replaceRules.mutateAsync({
        availabilityProfileId: savedProfile.id,
        rules: Object.entries(week).flatMap(([dayKey, shifts]) =>
          shifts.map((shift) => ({
            availability_profile_id: savedProfile.id,
            day_of_week: Number(dayKey),
            start_local_time: shift.start,
            end_local_time: shift.end,
            valid_from: today,
            format: "online" as const,
          })),
        ),
      });
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
      <PageHeader
        title="Dostupnost"
        description="Radno vreme, ponuđeni termini i izuzeci — osnova javnog bookinga."
        actions={
          <>
            <StatusBadge tone={profile?.enabled === false ? "wait" : "ok"}>
              {profile?.enabled === false ? "Pauziran" : "Aktivan raspored"}
            </StatusBadge>
            <Link
              href="/radni-prostor/profil"
              className="text-forest hover:text-coffee text-[13px] font-semibold no-underline transition-colors"
            >
              Nazad na profil
            </Link>
            {layer === "radno-vreme" ? saveButton : null}
          </>
        }
      />

      <TabPills
        tabs={[...layerTabs]}
        activeId={layer}
        onChange={openLayer}
        className="mb-5"
      />

      {isStandIn || (therapists.data ?? []).length > 1 ? (
        <div className="rounded-card border-warm/45 bg-warm/20 text-coffee mb-3.5 flex flex-wrap items-center gap-3 border px-5 py-3.5">
          <span className="text-[12.5px] font-semibold">
            {isStandIn
              ? "Vaš nalog nije terapeut — uređujete tuđi raspored (samo van produkcije)."
              : "Izaberite čiji raspored uređujete."}
          </span>
          <select
            aria-label="Terapeut"
            value={therapistId ?? ""}
            onChange={(event) => {
              setPickedId(event.target.value);
              setSyncedProfileId(null);
            }}
            className="border-line text-coffee min-h-9 rounded-lg border bg-transparent px-3 text-[13px] outline-none"
          >
            {(therapists.data ?? []).map((item) => (
              <option key={item.id} value={item.id}>
                {item.display_name}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      {layer === "slotovi" ? (
        <AvailabilitySlots
          profileId={profile?.id ?? null}
          manualMode={mode === "manual_slots"}
        />
      ) : layer === "radno-vreme" ? (
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
            onOpenExceptions={() => openLayer("izuzeci")}
          />

          {mode === "manual_slots" ? (
            <div className="rounded-card border-line bg-surface border px-5 py-4">
              <p className="text-coffee text-[13.5px] leading-[1.6]">
                U ovom režimu nema nedeljnog radnog vremena — svaki termin
                birate ručno u tabu{" "}
                <button
                  type="button"
                  onClick={() => openLayer("slotovi")}
                  className="text-forest cursor-pointer font-semibold underline"
                >
                  Termini
                </button>
                . Ovde podešavate samo rokove i način nuđenja.
              </p>
            </div>
          ) : rules.isPending && profile ? (
            <p className="text-ink-55 text-[13px]">Učitavanje rasporeda…</p>
          ) : (
            <AvailabilityWeekEditor
              week={week}
              errors={errors}
              appliedTemplateId={appliedTemplateId}
              onApplyTemplate={(templateId) => {
                const template = weekTemplates.find(
                  (candidate) => candidate.id === templateId,
                );
                if (!template) return;
                setWeek(template.build());
                setAppliedTemplateId(templateId);
                setSaved(false);
              }}
              onChange={(next) => {
                setWeek(next);
                setAppliedTemplateId(null);
                setSaved(false);
              }}
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
        <AvailabilityExceptions
          therapistProfileId={therapistId}
          manualMode={mode === "manual_slots"}
        />
      )}
    </section>
  );
}
