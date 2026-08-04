"use client";

import { Toggle } from "@/components/panel/toggle";
import { cn } from "@/helpers/cn";

import { FieldError } from "../screen-kompas/governance-error";
import type { TaxonomyTermFieldsProps } from "./field-props";
import { TaxonomyIconPicker } from "./taxonomy-icon-picker";
import { TechnicalDetails } from "./technical-details";

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
  return (
    <div className="mt-4">
      <label
        htmlFor={`${editorId}-description`}
        className="text-ink-70 mb-1.5 block text-[13px] font-semibold"
      >
        Opis koji vide posetioci
      </label>
      <p className="text-ink-55 mb-1.5 text-[12px] leading-[1.5]">
        Napišite jednu ili dve jasne rečenice. Opis se prikazuje ispod naziva i
        na javnoj stranici te oblasti ili teme.
      </p>
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
          Prikazuje se uz naziv na javnoj kartici. Koristi se ili oznaka iz
          kataloga ili slika iz biblioteke, nikada oboje.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {(
            [
              ["none", "Bez oznake"],
              ["icon", "Ikona"],
              ["asset", "Slika iz biblioteke"],
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
          <TaxonomyIconPicker
            value={draft.iconKey}
            onChange={(iconKey) => {
              setField("iconKey", iconKey);
              clearFieldError("iconKey");
            }}
            disabled={disabled}
            editorId={editorId}
            errorId={errorId("iconKey")}
            {...(fieldErrors.iconKey ? { error: fieldErrors.iconKey } : {})}
          />
        ) : null}

        {draft.visualMode === "asset" ? (
          <div className="mt-3 max-w-[460px]">
            {draft.assetId ? (
              <>
                <p className="text-ink-70 text-[12.5px]">
                  Ova stavka već koristi sliku iz biblioteke.
                </p>
                <TechnicalDetails summary="Detalji slike">
                  <span
                    id={`${editorId}-asset-id`}
                    className="text-ink-55 font-mono text-[12.5px]"
                  >
                    {draft.assetId}
                  </span>
                </TechnicalDetails>
              </>
            ) : (
              <p className="text-ink-55 text-[12.5px] leading-[1.5]">
                Biblioteka slika još nije dostupna u panelu. Do tada koristite
                oznaku iz kataloga ili ostavite stavku bez oznake.
              </p>
            )}
            <FieldError id={errorId("assetId")} message={fieldErrors.assetId} />
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
        <p className="text-ink-55 mb-1.5 text-[12px] leading-[1.5]">
          Ovu napomenu vide samo članovi stručnog i administratorskog tima.
          Posetioci sajta i korisnici Kompasa je ne vide.
        </p>
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
          <span>Ostaje u panelu; ne prikazuje se na javnim stranicama.</span>
          <span>{draft.internalExpertNote.length}/4000</span>
        </div>
      </div>
    </>
  );
}
