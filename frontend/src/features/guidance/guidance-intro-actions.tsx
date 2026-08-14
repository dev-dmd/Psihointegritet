"use client";

import { PublicLink as Link } from "@/components/ui/public-link";
import type { Route } from "next";
import { useTranslations } from "next-intl";

import { buildBookingHref } from "@/features/booking/booking-context";

interface GuidanceIntroActionsProps {
  onStart: () => void;
}

/**
 * The three ways out of the guided-selection intro.
 *
 * Extracted from `guidance-flow.tsx` so that file keeps shrinking against its
 * architecture baseline instead of growing.
 */
export function GuidanceIntroActions({ onStart }: GuidanceIntroActionsProps) {
  const t = useTranslations("guidance.flow.intro");
  return (
    <div className="mt-8 flex flex-wrap gap-3">
      <button
        type="button"
        onClick={onStart}
        className="bg-forest text-canvas hover:bg-forest-hover min-h-11 cursor-pointer rounded-full border-0 px-7 text-[15px] font-semibold transition-colors"
      >
        {t("start")}
      </button>
      <Link
        href="/tim"
        className="border-coffee/25 text-coffee hover:border-sage inline-flex min-h-11 items-center rounded-full border px-3 text-[15px] font-semibold no-underline transition-colors sm:px-6"
      >
        {t("browseTherapists")}
      </Link>
      {/*
        Third path, for people who already know who they see and simply book
        again: skip the questionnaire and open the widget directly. No
        therapist slug is pinned here — the widget already opens on a valid
        therapist and lets them change it, so a generic button never has to
        name one person.
      */}
      <Link
        href={buildBookingHref({ source: "therapist" }) as Route}
        className="border-coffee/25 text-coffee hover:border-sage inline-flex min-h-11 items-center rounded-full border px-6 text-[15px] font-semibold no-underline transition-colors"
      >
        {t("book")}
      </Link>
    </div>
  );
}
