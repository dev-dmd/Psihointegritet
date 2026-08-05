"use client";

import type { RichDoc } from "@/lib/content-governance/rich-doc";
import {
  slotSpecRegistry,
  type SlotFieldSpec,
} from "@/lib/content-governance/slot-schema";

import { SlotFieldEditor } from "../slot-field-editor";
import { KompasDocxImport } from "./kompas-docx-import";
import { ArticleOptionalSection } from "./article-optional-section";

const TEMPLATE = "article_detail" as const;

const OPTIONAL_SLOTS = [
  "questions",
  "practice",
  "body_outro",
  "sources",
  "cta",
] as const;

/**
 * Step 2 — Tekst.
 *
 * One large, calm writing surface. The author sees the body editor, the Word
 * import button, and — underneath — a row of "[Dodaj ovaj deo]" buttons for
 * the optional sections (questions, practice, outro, sources, cta).
 *
 * The generic SlotEditor is deliberately absent here: this step renders
 * exactly the fields the author needs, in the order they appear, with labels
 * that match how a person from Word thinks.
 */
export function ArticleTextStep({
  slotData,
  onChangeSlot,
  bodyImportKey,
  onImportedBody,
  editable,
  onApplySection,
}: {
  slotData: Record<string, unknown>;
  onChangeSlot: (name: string, next: unknown) => void;
  bodyImportKey: number;
  onImportedBody: (body: RichDoc) => void;
  editable: boolean;
  onApplySection: () => void;
}) {
  const specs = slotSpecRegistry[TEMPLATE];

  // ── body_intro (the main text) ────────────────────────────────────────
  const bodyIntroSlot = slotData.body_intro as
    { mode?: string; fields?: Record<string, unknown> } | undefined;
  const bodyIntroFields = bodyIntroSlot?.fields ?? {};

  const bodySpec = specs?.body_intro?.fields?.body as SlotFieldSpec | undefined;

  const existingBody = bodyIntroFields.body;
  const hasExistingText =
    typeof existingBody === "object" &&
    existingBody !== null &&
    Array.isArray((existingBody as { blocks?: unknown }).blocks) &&
    ((existingBody as { blocks: unknown[] }).blocks.length ?? 0) > 0;

  const wrapBodyIntro = (field: string) => (next: unknown) => {
    onChangeSlot("body_intro", {
      mode: "override",
      fields: { ...bodyIntroFields, [field]: next },
    });
  };

  return (
    <section
      id="compass-step-text"
      className="rounded-panel border-line scroll-mt-24 border px-6 py-5"
    >
      <h2 className="text-forest font-serif text-[17px]">Tekst</h2>

      {/* Main editor — large, calm, no "Body intro" wrapper */}
      <div className="mt-4">
        {bodySpec ? (
          <SlotFieldEditor
            key={`body_intro-body-v${bodyImportKey}`}
            fieldName="body"
            spec={bodySpec}
            value={bodyIntroFields.body}
            onChange={wrapBodyIntro("body")}
          />
        ) : null}
      </div>

      {/* Word import — same button, same behaviour as before */}
      {editable ? (
        <div className="mt-3">
          <KompasDocxImport
            hasExistingText={hasExistingText}
            onImported={onImportedBody}
          />
        </div>
      ) : null}

      {/* Optional sections */}
      <h2 className="text-forest mt-5 font-serif text-[17px] font-semibold">
        Dodajte još neki deo
      </h2>
      <p className="text-ink-55 mt-1 text-[12.5px] leading-[1.6]">
        Svaki dodatni deo se prikazuje u posebnom redu ispod glavnog teksta,
        onim redom kojim je ovde dodat. Možete dodati pitanja za razmišljanje,
        praktične korake, završnu poruku, izvore i dugmad za sledeći korak.
      </p>
      <div className="mt-2.5 flex flex-col gap-2.5">
        {OPTIONAL_SLOTS.map((slotName) => (
          <ArticleOptionalSection
            key={slotName}
            slotName={slotName}
            value={slotData[slotName]}
            onChange={(next) => onChangeSlot(slotName, next)}
            disabled={!editable}
            onApply={onApplySection}
          />
        ))}
      </div>
    </section>
  );
}
