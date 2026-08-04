"use client";

import Link from "next/link";

import { ActorBadge } from "@/components/panel/actor-badge";
import {
  StatusBadge,
  type StatusBadgeTone,
} from "@/components/panel/status-badge";
import { cn } from "@/helpers/cn";

import { CMS_STATUS_LABEL } from "../../compass-content-view";
import type { ApiContentRevision } from "../../content-api";
import {
  articlePublicPath,
  articleSteps,
  articleTitle,
} from "../../kompas-article-view";
import { TechnicalDetails } from "../taxonomy-term-form/technical-details";

const STATUS_TONE: Record<ApiContentRevision["status"], StatusBadgeTone> = {
  draft: "neutral",
  in_review: "wait",
  approved: "amber",
  published: "ok",
  archived: "soft",
};

/**
 * Who is looking at what, and how far it has got.
 *
 * The step row is the answer to "where did I stop" — an author who comes back
 * to a half-written text should not have to open every section to find out.
 */
export function KompasEditorHeader({ entry }: { entry: ApiContentRevision }) {
  const steps = articleSteps(entry);

  return (
    <header className="rounded-panel border-line bg-surface border px-6 py-5">
      <Link
        href="/radni-prostor/kompas?tab=content"
        className="text-forest inline-flex min-h-11 items-center text-[13px] font-semibold underline"
      >
        ← Nazad na Kompas sadržaj
      </Link>

      <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
        <h1 className="text-forest font-serif text-[24px] break-words">
          {articleTitle(entry)}
        </h1>
        <StatusBadge tone={STATUS_TONE[entry.status]}>
          {CMS_STATUS_LABEL[entry.status] ?? entry.status}
        </StatusBadge>
      </div>

      <ol className="mt-4 flex flex-wrap gap-2">
        {steps.map((step, index) => (
          <li
            key={step.id}
            className={cn(
              "rounded-full border px-3.5 py-1.5 text-[12px] font-semibold",
              step.done
                ? "border-sage bg-sage/12 text-forest"
                : "border-line-strong text-ink-55 bg-transparent",
            )}
            title={step.missing ?? undefined}
          >
            <span aria-hidden>{step.done ? "✓" : index + 1}</span> {step.label}
          </li>
        ))}
      </ol>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <ActorBadge action="Napisao/la" actor={entry.createdBy} />
        <ActorBadge action="Poslednja izmena" actor={entry.updatedBy} />
      </div>

      <TechnicalDetails summary="Adresa i verzija">
        <p className="text-ink-55 font-mono text-[12px]">
          {articlePublicPath(entry)} · {entry.versionLabel} · zaključavanje{" "}
          {entry.lockVersion}
        </p>
        <p className="text-ink-55 mt-1.5 text-[12px] leading-[1.5]">
          Javna rubrika Znanje još nije objavljena, pa ova adresa za sada ne
          otvara stranicu.
        </p>
      </TechnicalDetails>
    </header>
  );
}
