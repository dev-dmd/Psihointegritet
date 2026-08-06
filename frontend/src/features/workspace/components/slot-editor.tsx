"use client";

import type { ReactNode } from "react";

import type {
  SlotOverride,
  SlotSpec,
} from "@/lib/content-governance/slot-schema";

import { SlotFieldEditor } from "./slot-field-editor";

/**
 * One slot: `editable` (with the `inherit`/`override`/`hidden` payload
 * contract, ADR-017 Amendment 2 §A2.3), `computed` (no fields — derived at
 * render time) or `unmodeled` (no fields — no evidence of a shape yet). The
 * mode switch is the one place this editor writes `SlotOverride` directly;
 * `content-revision-editor.tsx` just stores whatever this returns under
 * `slotData[slotName]`.
 */
export function SlotEditor({
  slotName,
  spec,
  value,
  onChange,
}: {
  slotName: string;
  spec: SlotSpec;
  value: unknown;
  onChange: (next: unknown) => void;
}) {
  const label = humanizeSlotName(slotName);

  if (spec.editability === "computed") {
    return (
      <InertSlot
        label={label}
        note={`Automatski izračunato — nema polja za unos. ${spec.reason}`}
      />
    );
  }

  if (spec.editability === "unmodeled") {
    return (
      <InertSlot
        label={label}
        note={`Oblik ovog dela još nije definisan. ${spec.reason}`}
        warn
      />
    );
  }

  const override = (
    value && typeof value === "object" ? value : {}
  ) as Partial<SlotOverride>;
  const mode = override.mode ?? "inherit";
  const fields = override.fields ?? {};

  const setMode = (nextMode: SlotOverride["mode"]) => {
    onChange(
      nextMode === "override" ? { mode: nextMode, fields } : { mode: nextMode },
    );
  };

  const setField = (fieldName: string, fieldValue: unknown) => {
    onChange({
      mode: "override",
      fields: { ...fields, [fieldName]: fieldValue },
    });
  };

  return (
    <div className="rounded-panel border-line bg-surface mb-1 border px-4 py-3.5">
      <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-coffee text-[14.5px] font-semibold">
            {label}
          </span>
          {spec.required ? (
            <span className="text-danger text-[11px] font-semibold">
              obavezno
            </span>
          ) : null}
        </div>
        <div className="flex gap-1.5">
          <ModeButton
            active={mode === "inherit"}
            onClick={() => setMode("inherit")}
          >
            Nasledi
          </ModeButton>
          <ModeButton
            active={mode === "override"}
            onClick={() => setMode("override")}
          >
            Prepiši
          </ModeButton>
          {spec.visibility === "toggleable" ? (
            <ModeButton
              active={mode === "hidden"}
              onClick={() => setMode("hidden")}
            >
              Sakrij
            </ModeButton>
          ) : null}
        </div>
      </div>

      {mode === "inherit" ? (
        <p className="text-ink-55 text-[12.5px]">
          Koristi se postojeći tekst iz koda dok se ne prepiše (D-038).
        </p>
      ) : null}
      {mode === "hidden" ? (
        <p className="text-ink-55 text-[12.5px]">
          Sekcija se ne prikazuje na javnoj stranici.
        </p>
      ) : null}
      {mode === "override" ? (
        <div className="mt-2">
          {Object.entries(spec.fields).map(([fieldName, fieldSpec]) => (
            <SlotFieldEditor
              key={fieldName}
              fieldName={fieldName}
              spec={fieldSpec}
              value={fields[fieldName]}
              onChange={(next) => setField(fieldName, next)}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function InertSlot({
  label,
  note,
  warn,
}: {
  label: string;
  note: string;
  warn?: boolean;
}) {
  return (
    <div
      className={`rounded-panel mb-3 border border-dashed px-4 py-3 ${warn ? "border-badge-amber/40 bg-badge-amber-bg" : "border-line bg-surface/50"}`}
    >
      <div className="text-coffee text-[14px] font-semibold">{label}</div>
      <p className="text-ink-55 mt-1 text-[12.5px]">{note}</p>
    </div>
  );
}

function ModeButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`cursor-pointer rounded-full border px-3 py-1 text-[12px] font-semibold transition-colors ${
        active
          ? "border-forest bg-forest text-panel-canvas"
          : "border-line-strong text-ink-70 hover:border-coffee/40 bg-transparent"
      }`}
    >
      {children}
    </button>
  );
}

/** Placeholder labeling — see the same note in `slot-field-editor.tsx`. */
function humanizeSlotName(name: string): string {
  return name.replace(/_/g, " ").replace(/^./, (char) => char.toUpperCase());
}
