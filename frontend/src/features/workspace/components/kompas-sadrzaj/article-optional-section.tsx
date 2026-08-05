"use client";

import {
  slotSpecRegistry,
  type SlotFieldSpec,
} from "@/lib/content-governance/slot-schema";

import { SlotFieldEditor } from "../slot-field-editor";

/** Title-case a machine key for when no Serbian override exists. */
function fallbackLabel(name: string): string {
  return name
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/_/g, " ")
    .replace(/^./, (char) => char.toUpperCase());
}

/**
 * Human labels for optional section slot names (D-062).
 */
const SECTION_LABELS: Record<string, string> = {
  questions: "Pitanja za razmišljanje",
  practice: "Praktični koraci",
  body_outro: "Završna poruka",
  sources: "Izvori i literatura",
  cta: "Sledeći korak za čitaoca",
};

/**
 * What the author sees the section will do — one sentence per section.
 */
const SECTION_DESCRIPTIONS: Record<string, string> = {
  questions:
    "Pitanja se prikazuju ispod glavnog teksta. Čitalac može da zastane i razmisli o svakom pitanju pre nego što nastavi da čita.",
  practice:
    "Koraci se prikazuju kao numerisana lista sa naslovom. Čitalac može da ih prati jedan po jedan.",
  body_outro:
    "Završna poruka se prikazuje na kraju članka, posle svih ostalih delova. To je mesto za zaokruživanje teme.",
  sources:
    "Izvori i reference se prikazuju na dnu članka kao lista. Svaka stavka može imati naziv i opcioni link.",
  cta: "Dugmad koja čitaocu predlažu sledeći korak — na primer, da zakaže termin, istraži povezane teme ili stupi u kontakt.",
};

/**
 * Serbian labels for machine-level field names inside optional sections.
 *
 * The generic `humanizeFieldName` turns `intro` → "Intro" and `items` →
 * "Items", which means nothing to an author who came from Word.
 */
const FIELD_LABELS: Record<string, Record<string, string>> = {
  questions: { intro: "Kratko objašnjenje", items: "Pitanja" },
  practice: { title: "Naslov odeljka", steps: "Koraci" },
  body_outro: { body: "Tekst završne poruke" },
  sources: { items: "Izvori" },
  cta: { items: "Dugmad za sledeći korak" },
};

/**
 * Resolve a field label the author understands. Falls back to the generic
 * `humanizeFieldName` when no override exists.
 */
function fieldLabel(slotName: string, fieldName: string): string {
  return FIELD_LABELS[slotName]?.[fieldName] ?? fallbackLabel(fieldName);
}

const TEMPLATE = "article_detail" as const;

/**
 * One optional section: when absent, a "[Dodaj ovaj deo]" button.
 * When present, its fields rendered with a "[Ukloni ovaj deo]" button.
 *
 * For articles, there is no fallback, so the mode is always `override`.
 * "Nasledi", "Prepiši", "Sakrij" and "postojeći tekst iz koda" are
 * deliberately absent (D-062, §5H-2).
 */
export function ArticleOptionalSection({
  slotName,
  value,
  onChange,
  disabled,
  onApply,
  isApplying,
}: {
  slotName: string;
  value: unknown;
  onChange: (next: unknown) => void;
  disabled?: boolean;
  onApply?: () => void;
  /** When true, the "Primeni" button shows a loading label. */
  isApplying?: boolean;
}) {
  const label = SECTION_LABELS[slotName] ?? slotName;
  const description = SECTION_DESCRIPTIONS[slotName];
  const specs = slotSpecRegistry[TEMPLATE];
  const slotSpec = specs?.[slotName];

  const slot =
    value && typeof value === "object"
      ? (value as { mode?: string; fields?: Record<string, unknown> })
      : null;
  const isActive = slot?.mode === "override";
  const slotFields = slot?.fields ?? {};

  const wrap = (field: string) => (next: unknown) => {
    onChange({
      mode: "override",
      fields: { ...slotFields, [field]: next },
    });
  };

  const activate = () => {
    onChange({ mode: "override", fields: {} });
  };

  const remove = () => {
    onChange(null);
  };

  if (!isActive) {
    return (
      <button
        type="button"
        disabled={disabled}
        onClick={activate}
        className="border-line-strong text-ink-55 hover:border-forest hover:text-forest self-center rounded-full border border-dashed px-4 py-2 text-[12.5px] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 sm:self-start"
        aria-label={`Dodaj: ${label}`}
      >
        + {label}
      </button>
    );
  }

  // Collect non-boolean fields to render. The `standalone` boolean field is
  // a publish-gate marker (ADR-019 §6) and is deliberately hidden from the
  // author — its value is set by the `.docx` importer or the review step.
  const fields = Object.entries(
    (slotSpec?.fields as Record<string, SlotFieldSpec>) ?? {},
  ).filter(([, fieldSpec]) => fieldSpec.kind !== "boolean");

  return (
    <div className="rounded-tile border-line bg-surface w-full border px-4 py-3.5">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-forest text-[14px] font-semibold">{label}</h3>
        <button
          type="button"
          disabled={disabled}
          onClick={remove}
          className="text-ink-45 hover:text-danger cursor-pointer text-[11.5px] font-medium underline transition-colors disabled:cursor-not-allowed"
        >
          Ukloni ovaj deo
        </button>
      </div>

      {description ? (
        <p className="text-ink-55 mt-1.5 max-w-prose text-[12px] leading-[1.55]">
          {description}
        </p>
      ) : null}

      {fields.length === 0 ? (
        <p className="text-ink-45 mt-2 text-[12px]">
          Ovaj odeljak nema polja za uređivanje.
        </p>
      ) : (
        <div className="mt-3 flex flex-col gap-3">
          {fields.map(([fieldName, fieldSpec]) => (
            <SlotFieldEditor
              key={fieldName}
              fieldName={fieldLabel(slotName, fieldName)}
              spec={fieldSpec}
              value={slotFields[fieldName]}
              onChange={wrap(fieldName)}
            />
          ))}
        </div>
      )}

      {onApply ? (
        <div className="mt-3 flex justify-end">
          <button
            type="button"
            disabled={disabled || isApplying}
            onClick={onApply}
            className="border-forest text-forest hover:bg-forest/8 cursor-pointer rounded-full border px-4 py-1.5 text-[12px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isApplying ? "Primenjivanje…" : "Primeni"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
