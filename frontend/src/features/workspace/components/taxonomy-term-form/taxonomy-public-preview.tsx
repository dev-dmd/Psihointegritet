"use client";

import { useId } from "react";

import type { TaxonomyTerm } from "../../taxonomy-api";

import { type ManagedTaxonomyAxis, taxonomySeoWarnings } from "./model";
import type { TaxonomyTermDraft } from "./model";
import { findTaxonomyIcon } from "./taxonomy-icon-registry";
import { TechnicalDetails } from "./technical-details";

/**
 * What the visitor will actually see, while it is still being written.
 *
 * The form used to describe the result in prose ("prikazuje se ispod naziva")
 * and leave the author to imagine it. Showing the card removes the guess, and
 * it is also where the SEO advisories belong: they are about how this text
 * reads to a search engine, not a rule the author must satisfy to continue.
 */
export function TaxonomyPublicPreview({
  draft,
  axis,
  registryTerms,
}: {
  draft: TaxonomyTermDraft;
  axis: ManagedTaxonomyAxis;
  registryTerms: TaxonomyTerm[];
}) {
  const titleId = useId();
  const icon =
    draft.visualMode === "icon" ? findTaxonomyIcon(draft.iconKey) : null;
  const Icon = icon?.icon;
  const parent =
    axis === "topic" && draft.primaryParentTermId
      ? registryTerms.find((term) => term.termId === draft.primaryParentTermId)
      : undefined;
  const warnings = taxonomySeoWarnings(draft);
  const hasWarning = Boolean(warnings.publicLabel || warnings.shortDescription);

  // The whole section is tinted and full width so it reads as a result, not as
  // another field group. The card inside stays white: it is standing in for
  // something the visitor sees, and must not pick up the panel's colour.
  return (
    <section
      aria-labelledby={titleId}
      className="rounded-card bg-meadow/30 mt-4 px-5 py-4"
    >
      <p id={titleId} className="text-ink-70 text-[13px] font-semibold">
        Kako će izgledati posetiocima
      </p>

      {/* The tinted section spans the form; the card keeps a reading width,
          because that is roughly how wide it renders for a visitor. */}
      <div className="rounded-card border-line bg-surface mt-3 w-auto max-w-[420px] border px-5 py-4">
        <div className="flex items-start gap-3">
          {Icon ? (
            <span className="text-forest mt-0.5" aria-hidden>
              <Icon size={22} />
            </span>
          ) : null}
          <div className="min-w-0">
            {parent ? (
              <span className="text-sage text-[11px] font-semibold uppercase">
                {parent.publicLabel}
              </span>
            ) : null}
            <p className="text-forest mt-0.5 font-serif text-[18px] break-words">
              {draft.publicLabel.trim() || "Naziv još nije unet"}
            </p>
            <p className="text-ink-55 mt-1.5 text-[13px] leading-[1.5]">
              {draft.shortDescription.trim() ||
                "Opis se prikazuje ovde, ispod naziva."}
            </p>
          </div>
        </div>
      </div>

      {hasWarning ? (
        <TechnicalDetails summary="Napredna podešavanja za pretraživače">
          {warnings.publicLabel ? (
            <p className="text-badge-amber text-[12px] leading-[1.45]">
              {warnings.publicLabel}
            </p>
          ) : null}
          {warnings.shortDescription ? (
            <p className="text-badge-amber mt-1 text-[12px] leading-[1.45]">
              {warnings.shortDescription}
            </p>
          ) : null}
        </TechnicalDetails>
      ) : null}
    </section>
  );
}
