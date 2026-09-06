"use client";

import { useTranslations } from "next-intl";

import { StatusBadge } from "@/components/panel/status-badge";

import type { AppointmentRequestView } from "../appointment-view";
import { useRequestFormatting } from "../use-request-formatting";

/**
 * One row in „Moji termini" (KP 02).
 *
 * The date tile renders only when the request carries a real instant. The
 * public booking form sends none — it packs the wanted date into the free-text
 * note — and putting the submission date in a tile shaped like an appointment
 * date would read as „your appointment is on the 12th", which is the one
 * mistake this screen must not make.
 */
export function AppointmentRow({
  request,
}: {
  request: AppointmentRequestView;
}) {
  const t = useTranslations("account.appointments");
  const status = useTranslations("account.status");
  const formatLabel = useTranslations("account.format");
  const { longDateTime, shortDate, dayTile } = useRequestFormatting();

  const tile = request.startsAt ? dayTile(request.startsAt) : null;

  return (
    <li className="border-line bg-surface flex min-h-12 items-center gap-3.5 rounded-[18px] border px-[18px] py-[17px]">
      {tile ? (
        <span className="bg-meadow/25 w-12 shrink-0 rounded-xl px-1 py-2 text-center">
          <span className="text-sage block text-[10px] font-bold tracking-[0.08em] uppercase">
            {tile.month}
          </span>
          <span className="text-forest block font-serif text-xl">
            {tile.day}
          </span>
        </span>
      ) : null}

      <span className="min-w-0 flex-1">
        <span className="text-coffee block text-[14.5px] font-semibold">
          {request.startsAt
            ? longDateTime(request.startsAt)
            : t("requestTitle")}
        </span>
        <span className="text-ink-55 mt-0.5 block text-[12.5px]">
          {[
            request.format ? formatLabel(request.format) : null,
            t("sentOn", { date: shortDate(request.createdAt) }),
          ]
            .filter(Boolean)
            .join(" · ")}
        </span>
        {request.status ? (
          <StatusBadge tone={request.tone} className="mt-[7px]">
            {status(request.status)}
          </StatusBadge>
        ) : null}
      </span>
    </li>
  );
}
