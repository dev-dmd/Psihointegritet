"use client";

import { RichTextEditor } from "@/components/content/rich-text-editor";
import { contentCharacterLimits } from "@/lib/content-governance/limits";
import {
  emptyRichDoc,
  richDocText,
  type RichDoc,
} from "@/lib/content-governance/rich-doc";
import type {
  NonRepeaterFieldSpec,
  SlotFieldSpec,
} from "@/lib/content-governance/slot-schema";

import { RepeaterFieldEditor } from "./repeater-field-editor";

/**
 * One field, rendered by kind (CG-C1b). `rich` uses the real Tiptap editor
 * (CG-C5, `rich-text-editor.tsx`) — schema-restricted to RichDoc's node/mark
 * set, so it can never produce content the validator would reject.
 * `image`/`cta` are still stopgaps: no asset picker (ADR-018/Faza 2) and no
 * live CTA target lookup yet — just the fields the stored value needs.
 */
export function SlotFieldEditor({
  fieldName,
  spec,
  value,
  onChange,
}: {
  fieldName: string;
  spec: SlotFieldSpec;
  value: unknown;
  onChange: (next: unknown) => void;
}) {
  const label = humanizeFieldName(fieldName);

  if (spec.kind === "text") {
    const text = typeof value === "string" ? value : "";
    const limit = contentCharacterLimits[spec.limit];
    return (
      <Field
        label={label}
        required={spec.required ?? false}
        counter={`${text.length}/${limit}`}
      >
        <input
          aria-label={label}
          value={text}
          onChange={(event) => onChange(event.target.value)}
          className={inputClass}
        />
      </Field>
    );
  }

  if (spec.kind === "rich") {
    const doc =
      value && typeof value === "object" ? (value as RichDoc) : emptyRichDoc();
    const text = richDocText(doc);
    const limit = spec.maxChars ? contentCharacterLimits[spec.maxChars] : null;
    return (
      <Field
        label={label}
        required={spec.required ?? false}
        counter={
          limit
            ? `${text.length}/${limit} znakova · ${doc.blocks.length}/${spec.maxBlocks} blokova`
            : `${doc.blocks.length}/${spec.maxBlocks} blokova`
        }
      >
        <RichTextEditor value={doc} onChange={onChange} />
      </Field>
    );
  }

  if (spec.kind === "integer") {
    const num = typeof value === "number" ? value : "";
    return (
      <Field
        label={label}
        required={spec.required ?? false}
        counter={`${spec.min}–${spec.max}${spec.unit ? ` ${unitLabel(spec.unit)}` : ""}`}
      >
        <input
          aria-label={label}
          type="number"
          value={num}
          min={spec.min}
          max={spec.max}
          step={spec.step ?? 1}
          onChange={(event) =>
            onChange(
              event.target.value === ""
                ? undefined
                : Number(event.target.value),
            )
          }
          className={inputClass}
        />
      </Field>
    );
  }

  if (spec.kind === "money") {
    const num = typeof value === "number" ? value : "";
    return (
      <Field
        label={label}
        required={spec.required ?? false}
        counter={`${spec.min}–${spec.max} ${spec.currency}`}
      >
        <input
          aria-label={label}
          type="number"
          value={num}
          min={spec.min}
          max={spec.max}
          onChange={(event) =>
            onChange(
              event.target.value === ""
                ? undefined
                : Number(event.target.value),
            )
          }
          className={inputClass}
        />
      </Field>
    );
  }

  if (spec.kind === "image") {
    const image = (value ?? {}) as {
      assetId?: string;
      alt?: string;
      decorative?: boolean;
    };
    return (
      <Field label={label} required={spec.required ?? false}>
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
          <input
            placeholder="assetId"
            value={image.assetId ?? ""}
            onChange={(event) =>
              onChange({ ...image, assetId: event.target.value })
            }
            className={inputClass}
          />
          <input
            placeholder="alt tekst"
            value={image.alt ?? ""}
            onChange={(event) =>
              onChange({ ...image, alt: event.target.value })
            }
            className={inputClass}
            disabled={image.decorative === true}
          />
        </div>
        <label className="text-ink-70 mt-1.5 flex items-center gap-2 text-[12.5px]">
          <input
            type="checkbox"
            checked={image.decorative === true}
            onChange={(event) =>
              onChange({ ...image, decorative: event.target.checked })
            }
            className="accent-sage"
          />
          Dekorativna (bez alt teksta)
        </label>
      </Field>
    );
  }

  if (spec.kind === "cta") {
    const cta = (value ?? {}) as {
      action?: string;
      label?: string;
      targetId?: string;
    };
    return (
      <Field label={label} required={spec.required ?? false}>
        <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
          <select
            value={cta.action ?? ""}
            onChange={(event) =>
              onChange({ ...cta, action: event.target.value })
            }
            className={inputClass}
          >
            <option value="">— akcija —</option>
            {spec.allowedActions.map((action) => (
              <option key={action} value={action}>
                {action}
              </option>
            ))}
          </select>
          <input
            placeholder="Tekst dugmeta"
            value={cta.label ?? ""}
            onChange={(event) =>
              onChange({ ...cta, label: event.target.value })
            }
            className={inputClass}
          />
          <input
            placeholder="targetId (opciono)"
            value={cta.targetId ?? ""}
            onChange={(event) =>
              onChange({ ...cta, targetId: event.target.value })
            }
            className={inputClass}
          />
        </div>
      </Field>
    );
  }

  if (spec.kind === "imageList") {
    return (
      <SingleValueListEditor
        label={label}
        min={spec.min}
        max={spec.max}
        itemSpec={{ kind: "image" }}
        value={value}
        onChange={onChange}
      />
    );
  }

  if (spec.kind === "ctaList") {
    return (
      <SingleValueListEditor
        label={label}
        min={spec.min}
        max={spec.max}
        itemSpec={{
          kind: "cta",
          allowedActions: spec.allowedActions,
          ...(spec.targetType ? { targetType: spec.targetType } : {}),
        }}
        value={value}
        onChange={onChange}
      />
    );
  }

  // repeater
  return (
    <RepeaterFieldEditor
      label={label}
      min={spec.min}
      max={spec.max}
      item={spec.item}
      value={value}
      onChange={onChange}
    />
  );
}

function Field({
  label,
  required,
  counter,
  children,
}: {
  label: string;
  required?: boolean;
  counter?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-3">
      <div className="mb-1 flex items-center justify-between gap-2">
        <label className="text-ink-70 text-[13px] font-semibold">
          {label}
          {required ? <span className="text-danger ml-1">*</span> : null}
        </label>
        {counter ? (
          <span className="text-ink-55 text-[11.5px]">{counter}</span>
        ) : null}
      </div>
      {children}
    </div>
  );
}

const inputClass =
  "border-line-strong rounded-tile bg-panel-canvas text-coffee focus:border-sage w-full border px-3 py-2 text-sm outline-none disabled:opacity-60";

/**
 * `imageList`/`ctaList` — a bounded list where each item is directly one
 * `image`/`cta` value (not a multi-field row like `repeater`), so each array
 * entry stores exactly `{assetId, alt, ...}`/`{action, label, ...}`, matching
 * `AssetReference`/`CtaReference` on the wire — never a synthetic wrapper key.
 */
function SingleValueListEditor({
  label,
  min,
  max,
  itemSpec,
  value,
  onChange,
}: {
  label: string;
  min: number;
  max: number;
  itemSpec: NonRepeaterFieldSpec;
  value: unknown;
  onChange: (next: unknown[]) => void;
}) {
  const items = Array.isArray(value) ? value : [];

  return (
    <div className="mb-4">
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <span className="text-ink-70 text-[13px] font-semibold">{label}</span>
        <span className="text-ink-55 text-[11.5px]">
          Stavke: {items.length} od {max}
          {min > 0 ? ` (najmanje ${min})` : ""}
        </span>
      </div>
      <div className="flex flex-col gap-2.5">
        {items.map((item, index) => (
          <div
            key={index}
            className="border-line-strong rounded-tile flex items-start gap-2 border border-dashed p-2.5"
          >
            <div className="min-w-0 flex-1">
              <SlotFieldEditor
                fieldName={`#${index + 1}`}
                spec={itemSpec}
                value={item}
                onChange={(next) => {
                  const copy = [...items];
                  copy[index] = next;
                  onChange(copy);
                }}
              />
            </div>
            <button
              type="button"
              onClick={() => onChange(items.filter((_, i) => i !== index))}
              className="border-danger/45 text-danger hover:bg-danger/8 cursor-pointer rounded-full border bg-transparent px-3 py-1.5 text-[12px] font-semibold whitespace-nowrap"
            >
              Ukloni
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        disabled={items.length >= max}
        onClick={() => onChange([...items, undefined])}
        className="border-line-strong text-ink-70 hover:border-coffee/40 mt-2 cursor-pointer rounded-full border bg-transparent px-4 py-1.5 text-[12.5px] font-semibold disabled:cursor-not-allowed disabled:opacity-50"
      >
        Dodaj stavku
      </button>
    </div>
  );
}

function unitLabel(unit: "minute" | "session" | "participant"): string {
  return { minute: "min", session: "seansi", participant: "učesnika" }[unit];
}

/** Placeholder labeling: this is a draft-only admin editor (CG-C1b), not
 * customer-facing copy — a title-cased slot/field key is enough until CG-C2
 * adds the real live-validation display layer. */
function humanizeFieldName(name: string): string {
  return name
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/_/g, " ")
    .replace(/^./, (char) => char.toUpperCase());
}
