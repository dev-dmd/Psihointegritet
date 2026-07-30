"use client";

import type { NonRepeaterFieldSpec } from "@/lib/content-governance/slot-schema";

import { SlotFieldEditor } from "./slot-field-editor";

/**
 * `repeater` — a bounded list of multi-field items (FAQ entries, packages,
 * additional services…). Each item is `Record<string, NonRepeaterFieldSpec>`
 * — one level of nesting only (ADR-017 Amendment 2 §A2.5), so this never
 * needs to render another repeater inside itself.
 */
export function RepeaterFieldEditor({
  label,
  min,
  max,
  item,
  value,
  onChange,
}: {
  label: string;
  min: number;
  max: number;
  item: Record<string, NonRepeaterFieldSpec>;
  value: unknown;
  onChange: (next: unknown[]) => void;
}) {
  const items: Record<string, unknown>[] = Array.isArray(value)
    ? (value as Record<string, unknown>[])
    : [];

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
        {items.map((entry, index) => (
          <div
            key={index}
            className="border-line-strong rounded-tile border border-dashed p-3"
          >
            <div className="mb-2 flex items-center justify-between">
              <span className="text-ink-55 text-[11.5px] font-semibold">
                Stavka {index + 1}
              </span>
              <button
                type="button"
                onClick={() => onChange(items.filter((_, i) => i !== index))}
                className="border-danger/45 text-danger hover:bg-danger/8 cursor-pointer rounded-full border bg-transparent px-3 py-1 text-[12px] font-semibold"
              >
                Ukloni
              </button>
            </div>
            {Object.entries(item).map(([fieldName, fieldSpec]) => (
              <SlotFieldEditor
                key={fieldName}
                fieldName={fieldName}
                spec={fieldSpec}
                value={entry[fieldName]}
                onChange={(next) => {
                  const copy = [...items];
                  copy[index] = { ...entry, [fieldName]: next };
                  onChange(copy);
                }}
              />
            ))}
          </div>
        ))}
      </div>
      <button
        type="button"
        disabled={items.length >= max}
        onClick={() => onChange([...items, {}])}
        className="border-line-strong text-ink-70 hover:border-coffee/40 mt-2 cursor-pointer rounded-full border bg-transparent px-4 py-1.5 text-[12.5px] font-semibold disabled:cursor-not-allowed disabled:opacity-50"
      >
        Dodaj stavku
      </button>
    </div>
  );
}
