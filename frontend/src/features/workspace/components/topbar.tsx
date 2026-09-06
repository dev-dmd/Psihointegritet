"use client";

import { useFormatter, useTranslations } from "next-intl";
import { toast } from "sonner";

import { BackToSiteButton } from "@/components/shared/back-to-site-button";
import { LogoutAvatarMenu } from "@/components/shared/logout-avatar-menu";
import { useFallbackContent } from "@/content/use-content";
import type { Therapist } from "@/types/therapist";

import { useWorkspace } from "../workspace-context";
import { BellIcon, ChevronDownIcon, PlusIcon, TeamIcon } from "./icons";

function therapistLabel(
  therapists: readonly Therapist[],
  slug: string | null,
  allLabel: string,
): string {
  if (slug === null) return allLabel;
  const therapist = therapists.find((t) => t.slug === slug);
  // A therapist's own name is never translated — it is data, not copy.
  return therapist
    ? `${therapist.firstName} ${therapist.name.split(" ")[1]?.[0] ?? ""}.`
    : allLabel;
}

/**
 * Sticky topbar. The therapist filter is admin-only — it lets an owner focus
 * views on a single therapist (including „just me"), which is how the union
 * role model replaces the design's Vlasnik/Terapeut toggle.
 */
export function WorkspaceTopbar() {
  const { therapists } = useFallbackContent();
  const cycle: (string | null)[] = [
    null,
    ...therapists.map((therapist) => therapist.slug),
  ];
  const { isAdmin, selectedTherapistSlug, setSelectedTherapistSlug } =
    useWorkspace();
  const t = useTranslations("workspace");
  const format = useFormatter();

  // Was `new Intl.DateTimeFormat("sr-Latn-RS", …)`, which pinned the language
  // *and* silently used the runtime's timezone. `useFormatter` takes both from
  // the request config, where `timeZone` is set explicitly — the server runs
  // UTC and the browser does not, and around midnight the two disagreed.
  const rawToday = format.dateTime(new Date(), {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const today = rawToday.charAt(0).toUpperCase() + rawToday.slice(1);

  const cycleTherapist = () => {
    const index = cycle.indexOf(selectedTherapistSlug);
    const next = cycle[(index + 1) % cycle.length] ?? null;
    setSelectedTherapistSlug(next);
  };

  return (
    <header className="bg-panel-canvas/88 border-coffee/8 sticky top-0 z-40 flex items-center gap-3.5 border-b px-4 py-2.5 backdrop-blur-md md:px-8 md:py-3">
      <span className="flex items-baseline lg:hidden">
        <span className="text-forest font-serif text-xl font-medium">
          Psihointegritet
        </span>
        <span
          aria-hidden
          className="bg-warm ml-1 h-[5px] w-[5px] rounded-full"
        />
      </span>
      <span className="text-ink-55 hidden text-[13px] lg:inline">{today}</span>
      <span className="flex-1" />
      {isAdmin ? (
        <button
          type="button"
          onClick={cycleTherapist}
          className="border-coffee/12 text-coffee hover:border-sage bg-surface hidden items-center gap-2 rounded-full border px-3.5 py-2 text-[13px] font-semibold transition-colors lg:inline-flex"
        >
          <TeamIcon size={14} className="text-sage" />
          {therapistLabel(
            therapists,
            selectedTherapistSlug,
            t("topbar.allTherapists"),
          )}
          <ChevronDownIcon />
        </button>
      ) : null}
      <BackToSiteButton className="border-coffee/12 text-coffee hover:border-sage bg-surface" />
      <button
        type="button"
        title={t("topbar.notifications")}
        aria-label={t("topbar.notifications")}
        onClick={() => toast(t("topbar.noNotifications"))}
        className="border-coffee/12 text-coffee hover:border-sage bg-surface relative flex h-10 w-10 items-center justify-center rounded-full border transition-colors"
      >
        <BellIcon />
        <span
          aria-hidden
          className="bg-warm border-surface absolute top-2 right-[9px] h-2 w-2 rounded-full border-[1.5px]"
        />
      </button>
      <div className="lg:hidden">
        <LogoutAvatarMenu
          initials={isAdmin ? "A" : "T"}
          label={t("topbar.userMenu")}
          triggerClassName="border-meadow/55 bg-meadow/20 text-forest hover:border-sage focus-visible:ring-forest/35 flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border text-[13px] font-semibold outline-none transition-colors focus-visible:ring-2"
        />
      </div>
      <button
        type="button"
        onClick={() => toast(t("shell.quickActionSoon"))}
        className="bg-forest text-canvas hover:bg-forest-hover hidden items-center gap-2 rounded-full border-0 px-5 py-2.5 text-[13.5px] font-semibold transition-colors lg:inline-flex"
      >
        <PlusIcon />
        {t("topbar.quickAction")}
      </button>
    </header>
  );
}
