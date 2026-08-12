"use client";

import { contentCharacterLimits } from "@/lib/content-governance/limits";
import type { SlotFieldSpec } from "@/lib/content-governance/slot-schema";
import { slotSpecRegistry } from "@/lib/content-governance/slot-schema";

import { SlotFieldEditor } from "../slot-field-editor";
import {
  ArticleAuthorField,
  type CtaAuthorValue,
} from "./article-author-field";

const TEMPLATE = "article_detail" as const;

/**
 * Step 1 — Osnovni podaci.
 *
 * - Naslov teksta (hero.title)
 * - Kratak uvod (hero.lead, optional)
 * - Autor teksta (byline.author — therapist dropdown)
 *
 * The wire format stays the same as the generic schema editor; only the author
 * never sees `Action`, `VIEW_THERAPIST` or `targetId` (D-062).
 */
export function ArticleBasicsStep({
  slotData,
  onChangeSlot,
  disabled,
}: {
  slotData: Record<string, unknown>;
  onChangeSlot: (name: string, next: unknown) => void;
  disabled?: boolean;
}) {
  const specs = slotSpecRegistry[TEMPLATE];

  // ── hero slot ──────────────────────────────────────────────────────────
  const heroSlot = slotData.hero as
    { mode?: string; fields?: Record<string, unknown> } | undefined;
  const heroFields = heroSlot?.fields ?? {};

  const titleSpec = specs?.hero?.fields?.title as SlotFieldSpec | undefined;
  const leadSpec = specs?.hero?.fields?.lead as SlotFieldSpec | undefined;

  const wrapHero = (field: string) => (next: unknown) => {
    onChangeSlot("hero", {
      mode: "override",
      fields: { ...heroFields, [field]: next },
    });
  };

  // ── byline slot ────────────────────────────────────────────────────────
  const bylineSlot = slotData.byline as
    { mode?: string; fields?: Record<string, unknown> } | undefined;
  const bylineFields = bylineSlot?.fields ?? {};

  const authorValue = bylineFields?.author;

  const wrapByline = (next: CtaAuthorValue) => {
    onChangeSlot("byline", {
      mode: "override",
      fields: { ...bylineFields, author: next },
    });
  };

  const disabledProp = disabled === true;

  return (
    <section
      id="compass-step-basics"
      className="rounded-panel border-line scroll-mt-24 border px-6 py-5"
    >
      <h2 className="text-forest font-serif text-[17px]">Osnovni podaci</h2>

      <div className="mt-4 flex flex-col gap-5">
        {/* Title */}
        {titleSpec ? (
          <SlotFieldEditor
            fieldName="title"
            spec={titleSpec}
            value={heroFields.title}
            onChange={wrapHero("title")}
          />
        ) : null}

        {/* Lead — labeled "Kratak uvod" instead of the machine name */}
        {leadSpec ? (
          <div className="flex flex-col gap-1.5">
            <label className="text-ink-70 text-[13px] font-medium">
              Kratak uvod
            </label>
            <p className="text-ink-45 text-[11.5px] leading-[1.45]">
              Jedna ili dve rečenice koje se mogu prikazati na kartici i na
              početku teksta.
            </p>
            <input
              aria-label="Kratak uvod"
              type="text"
              value={typeof heroFields.lead === "string" ? heroFields.lead : ""}
              disabled={disabledProp}
              onChange={(event) => wrapHero("lead")(event.target.value)}
              placeholder="O čemu je ovaj tekst?"
              className="border-line-strong text-ink-90 bg-surface focus-visible:ring-coffee placeholder:text-ink-45 rounded-full border px-4 py-2.5 text-[13px] focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60"
            />
            <span className="text-ink-45 text-right text-[11px]">
              {typeof heroFields.lead === "string" ? heroFields.lead.length : 0}
              /{contentCharacterLimits["heroLead"]}
            </span>
          </div>
        ) : null}

        {/* Author */}
        <ArticleAuthorField
          value={authorValue}
          onChange={wrapByline}
          disabled={disabledProp}
        />
      </div>
    </section>
  );
}
