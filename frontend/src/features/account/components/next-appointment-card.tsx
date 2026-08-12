"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";

import { cn } from "@/helpers/cn";
import { useUiLocale } from "@/i18n/use-ui-locale";
import { localizedPath } from "@/lib/routes/localized-path";
import { BOOKING_PATH } from "@/features/account/booking-entry";

import type { AppointmentRequestView } from "../appointment-view";
import { useRequestFormatting } from "../use-request-formatting";
import { VideoIcon } from "./icons";

/**
 * The forest hero card („Sledeći termin", KP 01).
 *
 * The design shows a confirmed appointment with its date, therapist and a
 * „Uđi na sesiju" button. None of those three exist yet: confirmed
 * appointments are staff-readable only, the request carries therapist and
 * service as UUIDs with no client-side lookup, and there is no video session
 * to join. What the card shows instead is the true state of the newest open
 * request — which is real data, from the real Booking Engine, for the signed-in
 * person.
 */

const TONE_ON_FOREST = {
  ok: "bg-meadow/20 text-meadow",
  soft: "bg-meadow/20 text-meadow",
  wait: "bg-warm/20 text-warm",
  amber: "bg-warm/20 text-warm",
  neutral: "bg-panel-canvas/15 text-panel-canvas/75",
  dark: "bg-panel-canvas/15 text-panel-canvas/75",
  danger: "bg-panel-canvas/15 text-panel-canvas/75",
} as const;

interface NextAppointmentCardProps {
  request: AppointmentRequestView | null;
  isPending: boolean;
  isError: boolean;
}

export function NextAppointmentCard({
  request,
  isPending,
  isError,
}: NextAppointmentCardProps) {
  const t = useTranslations("account.home");
  const state = useTranslations("account.state");
  const status = useTranslations("account.status");
  const formatLabel = useTranslations("account.format");
  const locale = useUiLocale();
  const { longDateTime, shortDate } = useRequestFormatting();

  if (isPending) {
    return (
      <div
        aria-busy
        className="bg-forest/85 h-[188px] animate-pulse rounded-[24px]"
      />
    );
  }

  if (isError) {
    return (
      <div className="bg-forest rounded-[24px] px-6 pt-6 pb-[22px]">
        <p className="text-panel-canvas/85 text-sm leading-[1.55]">
          {state("loadFailed")}
        </p>
      </div>
    );
  }

  if (request === null) {
    return (
      <div className="bg-forest rounded-[24px] px-6 pt-6 pb-[22px]">
        <p className="text-meadow text-[11px] font-semibold tracking-[0.16em] uppercase">
          {t("nextAppointment")}
        </p>
        <p className="text-panel-canvas mt-3 font-serif text-[25px] leading-[1.15]">
          {t("emptyTitle")}
        </p>
        <p className="text-panel-canvas/60 mt-2 text-[13px] leading-[1.55]">
          {t("emptyNote")}
        </p>
        <Link
          href={BOOKING_PATH}
          className="bg-meadow text-forest hover:bg-meadow-hover mt-4 flex min-h-[46px] w-full items-center justify-center rounded-full px-4 text-[13.5px] font-semibold no-underline transition-colors"
        >
          {t("book")}
        </Link>
      </div>
    );
  }

  const isConfirmed = request.status === "converted";

  return (
    <div className="bg-forest rounded-[24px] px-6 pt-6 pb-[22px]">
      <div className="mb-3 flex items-center justify-between gap-2.5">
        <span className="text-meadow text-[11px] font-semibold tracking-[0.16em] uppercase">
          {isConfirmed ? t("nextAppointment") : t("yourRequest")}
        </span>
        {request.status ? (
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-2.75 py-1 text-[11.5px] font-semibold",
              TONE_ON_FOREST[request.tone],
            )}
          >
            <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-current" />
            {status(request.status)}
          </span>
        ) : null}
      </div>

      <p className="text-panel-canvas mb-4 font-serif text-[25px] leading-[1.15]">
        {request.startsAt
          ? longDateTime(request.startsAt)
          : isConfirmed
            ? t("confirmedTitle")
            : t("requestSentOn", { date: shortDate(request.createdAt) })}
      </p>

      <div className="border-panel-canvas/14 flex items-center gap-3 border-t pt-[15px]">
        <span className="text-panel-canvas/70 flex-1 text-[12.5px] leading-[1.5]">
          {isConfirmed ? t("confirmedNote") : t("pendingNote")}
        </span>
        {request.format ? (
          <span className="text-meadow inline-flex shrink-0 items-center gap-1.5 text-xs font-semibold">
            {request.format === "online" ? <VideoIcon /> : null}
            {formatLabel(request.format)}
          </span>
        ) : null}
      </div>

      <Link
        href={localizedPath("account.appointments", { locale })}
        className="border-panel-canvas/30 text-panel-canvas hover:border-meadow hover:text-meadow mt-4 flex min-h-[46px] w-full items-center justify-center rounded-full border-[1.5px] px-4 text-[13.5px] font-semibold no-underline transition-colors"
      >
        {t("allAppointments")}
      </Link>
    </div>
  );
}
