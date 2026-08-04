"use client";

import { LockIcon } from "../icons";
import { FieldError } from "../screen-kompas/governance-error";
import type { TaxonomyTermFieldsProps } from "./field-props";
import {
  AXIS_EDITOR_CONFIG,
  suggestTaxonomyStableId,
  taxonomySeoWarnings,
} from "./model";
import { TechnicalDetails } from "./technical-details";

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
>;

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
            // The internal id follows the name until the row exists; after
            // that the server locks it and the draft value is ignored. There
            // is no hand-editing path any more — a therapist cannot pick a
            // good one, and it is permanent from the first save.
            if (!term) setField("stableId", suggestTaxonomyStableId(value));
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

      <TechnicalDetails>
        <p className="text-ink-70 text-[12.5px] font-semibold">
          Interna oznaka sistema
        </p>
        <p className="text-ink-55 mt-1 text-[12px] leading-[1.5]">
          Ova oznaka čuva veze ispravnim čak i ako kasnije promenite javni
          naziv. Platforma je sama formira iz naziva.
        </p>
        <div
          id={`${editorId}-stable-id`}
          className="border-line-strong bg-panel-canvas text-ink-55 rounded-tile mt-2 flex min-h-[38px] items-center gap-2 border px-3 py-2 font-mono text-[12.5px]"
        >
          {term ? <LockIcon size={14} aria-hidden /> : null}
          {term?.stableId || draft.stableId || "—"}
        </div>
        <FieldError id={errorId("stableId")} message={fieldErrors.stableId} />
      </TechnicalDetails>
    </div>
  );
}
