"use client";

import Link from "next/link";
import type { Route } from "next";

import {
  StatusBadge,
  type StatusBadgeTone,
} from "@/components/panel/status-badge";

import type { ApiContentRevision } from "../../content-api";
import type { KompasArticleRow } from "../../kompas-content-list-view";

const STATUS_TONE: Record<ApiContentRevision["status"], StatusBadgeTone> = {
  draft: "neutral",
  in_review: "wait",
  approved: "amber",
  published: "ok",
  archived: "soft",
};

function formatDate(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toLocaleDateString("sr-Latn-RS", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** One text the team has written, and the way back into it. */
export function KompasContentRow({ row }: { row: KompasArticleRow }) {
  return (
    <article className="rounded-panel border-line bg-surface border px-5 py-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <Link
            href={
              `/radni-prostor/kompas/sadrzaj/${encodeURIComponent(row.entryId)}` as Route
            }
            className="text-forest font-serif text-[17px] break-words underline-offset-4 hover:underline"
          >
            {row.title}
          </Link>
          <p className="text-ink-45 mt-1 text-[12px]">
            {row.authorSlug
              ? `Potpisuje: ${row.authorSlug}`
              : "Autor još nije izabran"}
            {" · "}
            {formatDate(row.updatedAt)}
          </p>
        </div>
        <StatusBadge tone={STATUS_TONE[row.status]}>
          {row.statusLabel}
        </StatusBadge>
      </div>

      <p className="text-ink-55 mt-2 text-[12.5px] leading-[1.5]">
        {row.areaLabel ? (
          <>
            <span className="text-ink-70 font-semibold">Oblast:</span>{" "}
            {row.areaLabel}
            {row.topicLabels.length > 0
              ? ` · ${row.topicLabels.join(", ")}`
              : ""}
          </>
        ) : (
          "Još nije određeno kojoj oblasti i temi tekst pripada."
        )}
      </p>

      {row.link.missing.length > 0 ? (
        <p className="text-badge-amber mt-2 text-[12px] leading-[1.45]">
          Pre nego što ga Kompas može preporučiti: {row.link.missing[0]?.label}
          {row.link.missing.length > 1
            ? ` (i još ${row.link.missing.length - 1})`
            : ""}
        </p>
      ) : null}
    </article>
  );
}
