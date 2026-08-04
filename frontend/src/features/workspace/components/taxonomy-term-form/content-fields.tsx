"use client";

import { Toggle } from "@/components/panel/toggle";
import { cn } from "@/helpers/cn";

import { FieldError } from "../screen-kompas/governance-error";
import type { TaxonomyTermFieldsProps } from "./field-props";
import { taxonomySeoWarnings } from "./model";

type ContentFieldsProps = Omit<
  TaxonomyTermFieldsProps,
  "axis" | "term" | "registryTerms"
>;

export function TaxonomyDescriptionField({
  draft,
  setField,
  disabled,
  editorId,
  fieldErrors,
  clearFieldError,
  errorId,
  inputClass,
}: ContentFieldsProps) {
  const seoWarning = taxonomySeoWarnings(draft).shortDescription;
  return (
    <div className="mt-4">
      <label
        htmlFor={`${editorId}-description`}
        className="text-ink-70 mb-1.5 block text-[13px] font-semibold"
      >
        Kratak javni opis
      </label>
      <textarea
        id={`${editorId}-description`}
        value={draft.shortDescription}
        maxLength={500}
        rows={4}
        disabled={disabled}
        onChange={(event) => {
          setField("shortDescription", event.target.value);
          clearFieldError("shortDescription");
        }}
        aria-invalid={Boolean(fieldErrors.shortDescription)}
        aria-describedby={
          fieldErrors.shortDescription ? errorId("shortDescription") : undefined
        }
        className={inputClass(
          "shortDescription",
          "border-line-strong rounded-tile bg-panel-canvas text-coffee focus:border-sage w-full resize-y border px-3.5 py-2.5 text-sm leading-[1.55] outline-none disabled:opacity-60",
        )}
      />
      <FieldError
        id={errorId("shortDescription")}
        message={fieldErrors.shortDescription}
      />
      <p className="text-ink-45 mt-1 text-right text-[11px]">
        {draft.shortDescription.length}/500
      </p>
      {seoWarning ? (
        <p className="text-badge-amber mt-1 text-[11.5px] leading-[1.4]">
          {seoWarning}
        </p>
      ) : null}
    </div>
  );
}

export function TaxonomyContentFields(props: ContentFieldsProps) {
  const {
    draft,
    setField,
    disabled,
    editorId,
    fieldErrors,
    clearFieldError,
    errorId,
    inputClass,
  } = props;

  return (
    <>
      {/* The public description is NOT rendered here. It belongs to the step
          that asks "how will this look to visitors", and this group used to
          repeat it — the author answered once, then met the same empty-looking
          field two steps later and reasonably assumed nothing had saved. */}
      <div className="border-line rounded-tile mt-4 border px-4 py-4">
        <div className="text-ink-70 text-[13px] font-semibold">
          Vizuelna oznaka
        </div>
        <p className="text-ink-55 mt-1 text-[12px] leading-[1.5]">
          Može se koristiti ikona ili jedan postojeći asset, nikada oba.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {(
            [
              ["none", "Bez oznake"],
              ["icon", "Ikona"],
              ["asset", "Asset"],
            ] as const
          ).map(([mode, label]) => (
            <button
              key={mode}
              type="button"
              aria-pressed={draft.visualMode === mode}
              disabled={disabled}
              onClick={() => {
                setField("visualMode", mode);
                clearFieldError("iconKey");
                clearFieldError("assetId");
              }}
              className={cn(
                "cursor-pointer rounded-full border px-3.5 py-2 text-[12.5px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50",
                draft.visualMode === mode
                  ? "border-coffee bg-coffee text-panel-canvas"
                  : "border-line-strong text-ink-70 hover:border-coffee/40 bg-transparent",
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {draft.visualMode === "icon" ? (
          <div className="mt-3 max-w-[460px]">
            <label
              htmlFor={`${editorId}-icon-key`}
              className="text-ink-70 mb-1.5 block text-[12.5px] font-semibold"
            >
              Ključ ikone
            </label>
            <input
              id={`${editorId}-icon-key`}
              value={draft.iconKey}
              maxLength={120}
              disabled={disabled}
              placeholder="sparkles"
              onChange={(event) => {
                setField("iconKey", event.target.value);
                clearFieldError("iconKey");
              }}
              aria-invalid={Boolean(fieldErrors.iconKey)}
              aria-describedby={
                fieldErrors.iconKey ? errorId("iconKey") : undefined
              }
              className={inputClass(
                "iconKey",
                "border-line-strong rounded-tile bg-panel-canvas text-coffee focus:border-sage w-full border px-3.5 py-2.5 font-mono text-sm outline-none disabled:opacity-60",
              )}
            />
            <FieldError id={errorId("iconKey")} message={fieldErrors.iconKey} />
            <p className="text-ink-55 mt-1.5 text-[12px]">
              Koristi ključ iz odobrenog seta ikona interfejsa.
            </p>
          </div>
        ) : null}

        {draft.visualMode === "asset" ? (
          <div className="mt-3 max-w-[460px]">
            <label
              htmlFor={`${editorId}-asset-id`}
              className="text-ink-70 mb-1.5 block text-[12.5px] font-semibold"
            >
              ID postojećeg asseta
            </label>
            <input
              id={`${editorId}-asset-id`}
              value={draft.assetId}
              maxLength={191}
              disabled={disabled}
              placeholder="asset-id"
              onChange={(event) => {
                setField("assetId", event.target.value);
                clearFieldError("assetId");
              }}
              aria-invalid={Boolean(fieldErrors.assetId)}
              aria-describedby={
                fieldErrors.assetId ? errorId("assetId") : undefined
              }
              className={inputClass(
                "assetId",
                "border-line-strong rounded-tile bg-panel-canvas text-coffee focus:border-sage w-full border px-3.5 py-2.5 font-mono text-sm outline-none disabled:opacity-60",
              )}
            />
            <FieldError id={errorId("assetId")} message={fieldErrors.assetId} />
            <p className="text-ink-55 mt-1.5 text-[12px]">
              Do asset biblioteke ovde se unosi ID već odobrenog asseta.
            </p>
          </div>
        ) : null}
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <div className="border-line rounded-tile flex items-start justify-between gap-4 border px-4 py-3.5">
          <div>
            <div className="text-ink-70 text-[13px] font-semibold">
              Javno vidljivo
            </div>
            <p className="text-ink-55 mt-1 text-[12px] leading-[1.45]">
              Termin se može prikazati javno tek kada bude objavljen.
            </p>
          </div>
          <Toggle
            checked={draft.publicVisible}
            disabled={disabled}
            label="Javno vidljivo"
            onChange={(checked) => {
              setField("publicVisible", checked);
              clearFieldError("publicVisible");
            }}
          />
        </div>
        <div className="border-line rounded-tile flex items-start justify-between gap-4 border px-4 py-3.5">
          <div>
            <div className="text-ink-70 text-[13px] font-semibold">
              Aktivno u Kompasu
            </div>
            <p className="text-ink-55 mt-1 text-[12px] leading-[1.45]">
              Odvojena kontrola za izbor i recommendation katalog.
            </p>
          </div>
          <Toggle
            checked={draft.compassEnabled}
            disabled={disabled}
            label="Aktivno u Kompasu"
            onChange={(checked) => {
              setField("compassEnabled", checked);
              clearFieldError("compassEnabled");
            }}
          />
        </div>
      </div>

      <div className="mt-4">
        <label
          htmlFor={`${editorId}-internal-note`}
          className="text-ink-70 mb-1.5 block text-[13px] font-semibold"
        >
          Interna stručna napomena
        </label>
        <textarea
          id={`${editorId}-internal-note`}
          value={draft.internalExpertNote}
          maxLength={4_000}
          rows={5}
          disabled={disabled}
          onChange={(event) => {
            setField("internalExpertNote", event.target.value);
            clearFieldError("internalExpertNote");
          }}
          aria-invalid={Boolean(fieldErrors.internalExpertNote)}
          aria-describedby={
            fieldErrors.internalExpertNote
              ? errorId("internalExpertNote")
              : undefined
          }
          className={inputClass(
            "internalExpertNote",
            "border-line-strong rounded-tile bg-panel-canvas text-coffee focus:border-sage w-full resize-y border px-3.5 py-2.5 text-sm leading-[1.55] outline-none disabled:opacity-60",
          )}
        />
        <FieldError
          id={errorId("internalExpertNote")}
          message={fieldErrors.internalExpertNote}
        />
        <div className="text-ink-55 mt-1.5 flex flex-wrap justify-between gap-2 text-[12px]">
          <span>Vidljiva je samo osoblju i nikada ne ulazi u javni API.</span>
          <span>{draft.internalExpertNote.length}/4000</span>
        </div>
      </div>
    </>
  );
}
