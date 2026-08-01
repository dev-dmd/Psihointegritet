"use client";

import { LockIcon } from "../icons";
import { FieldError } from "../screen-kompas/governance-error";
import type { TaxonomyTermFieldsProps } from "./field-props";
import { AXIS_EDITOR_CONFIG, taxonomySeoWarnings } from "./model";

type IdentityFieldsProps = Pick<
  TaxonomyTermFieldsProps,
  | "axis"
  | "term"
  | "draft"
  | "setField"
  | "disabled"
  | "editorId"
  | "fieldErrors"
  | "clearFieldError"
  | "errorId"
  | "inputClass"
> & {
  deriveStableId?: (publicLabel: string) => string;
  onStableIdEdited?: () => void;
};

export function TaxonomyIdentityFields({
  axis,
  term,
  draft,
  setField,
  disabled,
  editorId,
  fieldErrors,
  clearFieldError,
  errorId,
  inputClass,
  deriveStableId,
  onStableIdEdited,
}: IdentityFieldsProps) {
  const config = AXIS_EDITOR_CONFIG[axis];
  const seoWarning = taxonomySeoWarnings(draft).publicLabel;

  return (
    <div className="mt-5 grid gap-4 md:grid-cols-2">
      <div>
        <label
          htmlFor={`${editorId}-label`}
          className="text-ink-70 mb-1.5 block text-[13px] font-semibold"
        >
          {config.publicLabel}
        </label>
        <input
          id={`${editorId}-label`}
          value={draft.publicLabel}
          maxLength={160}
          disabled={disabled}
          onChange={(event) => {
            const value = event.target.value;
            setField("publicLabel", value);
            if (deriveStableId) setField("stableId", deriveStableId(value));
            clearFieldError("publicLabel");
          }}
          aria-invalid={Boolean(fieldErrors.publicLabel)}
          aria-describedby={
            fieldErrors.publicLabel ? errorId("publicLabel") : undefined
          }
          className={inputClass(
            "publicLabel",
            "border-line-strong rounded-tile bg-panel-canvas text-coffee focus:border-sage w-full border px-3.5 py-2.5 text-sm outline-none disabled:opacity-60",
          )}
        />
        <FieldError
          id={errorId("publicLabel")}
          message={fieldErrors.publicLabel}
        />
        <p className="text-ink-45 mt-1 text-right text-[11px]">
          {draft.publicLabel.length}/160
        </p>
        {seoWarning ? (
          <p className="text-badge-amber mt-1 text-[11.5px] leading-[1.4]">
            {seoWarning}
          </p>
        ) : null}
      </div>

      <div>
        <label
          htmlFor={`${editorId}-stable-id`}
          className="text-ink-70 mb-1.5 block text-[13px] font-semibold"
        >
          Stabilni ID
        </label>
        {term ? (
          <div
            id={`${editorId}-stable-id`}
            className="border-line-strong bg-panel-canvas text-ink-55 rounded-tile flex min-h-[42px] items-center gap-2 border px-3.5 py-2.5 font-mono text-[12.5px]"
          >
            <LockIcon size={14} aria-hidden />
            {term.stableId}
          </div>
        ) : (
          <input
            id={`${editorId}-stable-id`}
            value={draft.stableId}
            maxLength={80}
            disabled={disabled}
            placeholder={config.stableIdExample}
            onChange={(event) => {
              onStableIdEdited?.();
              setField("stableId", event.target.value);
              clearFieldError("stableId");
            }}
            aria-invalid={Boolean(fieldErrors.stableId)}
            aria-describedby={
              fieldErrors.stableId ? errorId("stableId") : undefined
            }
            className={inputClass(
              "stableId",
              "border-line-strong rounded-tile bg-panel-canvas text-coffee focus:border-sage w-full border px-3.5 py-2.5 font-mono text-sm outline-none disabled:opacity-60",
            )}
          />
        )}
        <FieldError id={errorId("stableId")} message={fieldErrors.stableId} />
        <p className="text-ink-55 mt-1.5 text-[12px]">
          {term
            ? "Zaključan je nakon kreiranja i koristi se za veze i preporuke."
            : "Predlog možete ispraviti samo pre prvog čuvanja. Posle toga ID ostaje zaključan."}
        </p>
      </div>
    </div>
  );
}
