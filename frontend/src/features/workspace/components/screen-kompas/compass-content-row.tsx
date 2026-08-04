"use client";

import Link from "next/link";

import {
  StatusBadge,
  type StatusBadgeTone,
} from "@/components/panel/status-badge";

import type { CompassContentStage } from "../../compass-content-linking";
import type { CompassContentRow as Row } from "../../compass-content-view";

const STAGE_TONE: Record<CompassContentStage, StatusBadgeTone> = {
  "not-linked": "soft",
  incomplete: "amber",
  draft: "neutral",
  "in-review": "wait",
  ready: "amber",
  published: "ok",
  archived: "soft",
};

function Facet({ label, values }: { label: string; values: string[] }) {
  if (values.length === 0) return null;
  return (
    <p className="text-ink-55 text-[12.5px] leading-[1.5]">
      <span className="text-ink-70 font-semibold">{label}:</span>{" "}
      {values.join(", ")}
    </p>
  );
}

/**
 * One CMS entry as the Kompas workspace sees it.
 *
 * The row answers one question — will Kompas recommend this, and if not, what
 * is the next thing to do. Editing happens in the CMS editor this links to;
 * nothing about the content is duplicated or writable from here.
 */
export function CompassContentRow({ row }: { row: Row }) {
  return (
    <article className="rounded-panel border-line bg-surface border px-5 py-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-forest font-serif text-[17px] break-words">
            {row.title}
          </p>
          <p className="text-ink-45 mt-1 text-[12px]">
            {row.typeLabel} · {row.statusLabel}
          </p>
        </div>
        <StatusBadge tone={STAGE_TONE[row.link.stage]}>
          {row.link.stageLabel}
        </StatusBadge>
      </div>

      {row.link.missing.length > 0 ? (
        <div className="border-line-strong rounded-tile mt-3 border px-4 py-3">
          <p className="text-ink-70 text-[12.5px] font-semibold">
            Da bi Kompas mogao da ga preporuči, nedostaje:
          </p>
          <ul className="text-ink-55 mt-1.5 list-disc space-y-1 pl-5 text-[12.5px] leading-[1.5]">
            {row.link.missing.map((item) => (
              <li key={item.id}>{item.label}</li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="mt-3 space-y-1">
          <Facet
            label="Oblast"
            values={row.areaLabel ? [row.areaLabel] : []}
          />
          <Facet label="Teme" values={row.topicLabels} />
          <Facet label="Kome je namenjeno" values={row.audienceLabels} />
          <Facet label="Šta čitalac dobija" values={row.goalLabels} />
        </div>
      )}

      {row.link.advisory ? (
        <p className="text-badge-amber mt-3 text-[12px] leading-[1.45]">
          {row.link.advisory}
        </p>
      ) : null}

      <Link
        href={`/radni-prostor/sadrzaj?entryId=${encodeURIComponent(row.entryId)}&izvor=kompas`}
        className="text-forest mt-3 inline-flex min-h-11 items-center text-[13px] font-semibold underline"
      >
        {row.link.stage === "not-linked"
          ? "Poveži u CMS editoru →"
          : "Otvori u CMS editoru →"}
      </Link>
    </article>
  );
}
