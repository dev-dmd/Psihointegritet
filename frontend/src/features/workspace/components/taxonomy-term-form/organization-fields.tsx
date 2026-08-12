"use client";

import { cn } from "@/helpers/cn";

import { FieldError } from "../screen-kompas/governance-error";
import type { TaxonomyTermFieldsProps } from "./field-props";
import { DISPLAY_ORDER_PRESETS, displayOrderPreset } from "./taxonomy-copy";
import { broadSearchTerms } from "./taxonomy-duplicate-match";
import { TechnicalDetails } from "./technical-details";
import { AXIS_EDITOR_CONFIG, parseTaxonomySearchTerms } from "./model";

export function TaxonomyOrganizationFields({
  axis,
  term,
  registryTerms,
  draft,
  setField,
  disabled,
  editorId,
  fieldErrors,
  clearFieldError,
  errorId,
  inputClass,
}: TaxonomyTermFieldsProps) {
  const config = AXIS_EDITOR_CONFIG[axis];
  const areas = registryTerms.filter(
    (item) =>
      item.axis === "topic_group" &&
      (item.status !== "archived" || item.termId === draft.primaryParentTermId),
  );
  const journeyIntents = registryTerms.filter(
    (item) =>
      item.axis === "journey_intent" &&
      item.systemDefined &&
      (item.status !== "archived" || item.termId === draft.journeyIntentTermId),
  );
  const availableRelatedTopics = registryTerms.filter(
    (item) =>
      item.axis === "topic" &&
      (item.status !== "archived" ||
        draft.relatedTopicIds.includes(item.termId)) &&
      item.termId !== term?.termId,
  );
  const searchTerms = parseTaxonomySearchTerms(draft.searchTermsText);
  const searchTermCount = searchTerms.length;
  const broadTerms = broadSearchTerms(searchTerms);

  return (
    <>
      {config.requiresTopicContext ? (
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div>
            <label
              htmlFor={`${editorId}-parent`}
              className="text-ink-70 mb-1.5 block text-[13px] font-semibold"
            >
              Kojoj oblasti pripada ova tema?
            </label>
            <select
              id={`${editorId}-parent`}
              value={draft.primaryParentTermId}
              disabled={disabled || areas.length === 0}
              onChange={(event) => {
                setField("primaryParentTermId", event.target.value);
                clearFieldError("primaryParentTermId");
              }}
              aria-invalid={Boolean(fieldErrors.primaryParentTermId)}
              aria-describedby={
                fieldErrors.primaryParentTermId
                  ? errorId("primaryParentTermId")
                  : undefined
              }
              className={inputClass(
                "primaryParentTermId",
                "border-line-strong rounded-tile bg-panel-canvas text-coffee focus:border-sage w-full border px-3.5 py-2.5 text-sm outline-none disabled:opacity-60",
              )}
            >
              <option value="">Izaberite oblast</option>
              {areas.map((area) => (
                <option key={area.termId} value={area.termId}>
                  {area.publicLabel}
                  {area.status === "archived" ? " · arhivirano" : ""}
                </option>
              ))}
            </select>
            <FieldError
              id={errorId("primaryParentTermId")}
              message={fieldErrors.primaryParentTermId}
            />
            {areas.length === 0 ? (
              <p className="text-badge-amber mt-1.5 text-[12px]">
                Prvo napravite oblast u tabu „Oblasti”.
              </p>
            ) : null}
          </div>

          <div>
            <label
              htmlFor={`${editorId}-journey`}
              className="text-ink-70 mb-1.5 block text-[13px] font-semibold"
            >
              Gde ova tema može da vodi korisnika?
            </label>
            <select
              id={`${editorId}-journey`}
              value={draft.journeyIntentTermId}
              disabled={disabled || journeyIntents.length === 0}
              onChange={(event) => {
                setField("journeyIntentTermId", event.target.value);
                clearFieldError("journeyIntentTermId");
              }}
              aria-invalid={Boolean(fieldErrors.journeyIntentTermId)}
              aria-describedby={
                fieldErrors.journeyIntentTermId
                  ? errorId("journeyIntentTermId")
                  : undefined
              }
              className={inputClass(
                "journeyIntentTermId",
                "border-line-strong rounded-tile bg-panel-canvas text-coffee focus:border-sage w-full border px-3.5 py-2.5 text-sm outline-none disabled:opacity-60",
              )}
            >
              <option value="">Izaberite put korisnika</option>
              {journeyIntents.map((journey) => (
                <option key={journey.termId} value={journey.termId}>
                  {journey.publicLabel}
                  {journey.status === "archived" ? " · arhivirano" : ""}
                </option>
              ))}
            </select>
            <FieldError
              id={errorId("journeyIntentTermId")}
              message={fieldErrors.journeyIntentTermId}
            />
            <p className="text-ink-55 mt-1.5 text-[12px]">
              Bira se iz zaključanog sistemskog registra i ne upisuje se kao
              slobodan tekst.
            </p>
          </div>
        </div>
      ) : null}

      <div className="mt-4">
        <div>
          <label
            htmlFor={`${editorId}-search-terms`}
            className="text-ink-70 mb-1.5 block text-[13px] font-semibold"
          >
            Kako ljudi mogu da traže ovu oblast ili temu?
          </label>
          <p className="text-ink-55 mb-1.5 text-[12px] leading-[1.5]">
            Unesite druge nazive, svakodnevne izraze ili pitanja koja ljudi
            koriste pri pretrazi. Ovi izrazi pomažu pronalaženju, ali ne
            stvaraju stručne veze niti menjaju preporuke.
          </p>
          <textarea
            id={`${editorId}-search-terms`}
            value={draft.searchTermsText}
            maxLength={16_100}
            rows={4}
            disabled={disabled}
            placeholder={
              axis === "topic"
                ? "teskoba\nstalna zabrinutost\nosećam stezanje u grudima\nkako da smirim anksioznost"
                : "Jedan pojam u svakom redu"
            }
            onChange={(event) => {
              setField("searchTermsText", event.target.value);
              clearFieldError("searchTerms");
            }}
            aria-invalid={Boolean(fieldErrors.searchTerms)}
            aria-describedby={
              fieldErrors.searchTerms ? errorId("searchTerms") : undefined
            }
            className={inputClass(
              "searchTerms",
              "border-line-strong rounded-tile bg-panel-canvas text-coffee focus:border-sage w-full resize-y border px-3.5 py-2.5 text-sm leading-[1.55] outline-none disabled:opacity-60",
            )}
          />
          <FieldError
            id={errorId("searchTerms")}
            message={fieldErrors.searchTerms}
          />
          <div className="text-ink-55 mt-1.5 flex flex-wrap justify-between gap-2 text-[12px]">
            <span>Jedan izraz po redu ili odvojen zarezom.</span>
            <span>{searchTermCount}/100</span>
          </div>
          {broadTerms.length > 0 ? (
            <p className="text-badge-amber mt-1.5 text-[12px] leading-[1.45]">
              {broadTerms.map((term) => `„${term}”`).join(", ")}{" "}
              {broadTerms.length === 1
                ? "je veoma širok izraz"
                : "su veoma široki izrazi"}{" "}
              i može da prikaže mnogo nepovezanih rezultata. Razmotrite
              precizniji izraz.
            </p>
          ) : null}
        </div>
      </div>

      {/* "Redosled prikaza" was a raw 0–100000 integer. Nobody outside the team
          can say what 37 means, and the field only ever needs three answers.
          The wire value stays an integer; the UI stops asking for one. */}
      <div className="mt-4">
        <span
          id={`${editorId}-sort-order-label`}
          className="text-ink-70 mb-1.5 block text-[13px] font-semibold"
        >
          Redosled prikaza
        </span>
        <div
          role="radiogroup"
          aria-labelledby={`${editorId}-sort-order-label`}
          className="flex flex-wrap gap-2"
        >
          {DISPLAY_ORDER_PRESETS.map((preset) => {
            const isSelected =
              displayOrderPreset(Number(draft.sortOrder) || 0) === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                role="radio"
                aria-checked={isSelected}
                disabled={disabled}
                onClick={() => {
                  setField("sortOrder", String(preset.value));
                  clearFieldError("sortOrder");
                }}
                className={cn(
                  "min-h-11 cursor-pointer rounded-full border px-4 text-[12.5px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50",
                  isSelected
                    ? "border-coffee bg-coffee text-panel-canvas"
                    : "border-line-strong text-ink-70 hover:border-coffee/40 bg-transparent",
                )}
              >
                {preset.label}
              </button>
            );
          })}
        </div>
        <FieldError id={errorId("sortOrder")} message={fieldErrors.sortOrder} />
        <p className="text-ink-55 mt-1.5 text-[12px] leading-[1.45]">
          Određuje mesto u listi oblasti ili tema. Stavke sa istim izborom
          ređaju se po nazivu.
        </p>
        <TechnicalDetails summary="Tačna vrednost redosleda">
          <span
            id={`${editorId}-sort-order`}
            className="text-ink-55 font-mono text-[12.5px]"
          >
            {draft.sortOrder || "0"}
          </span>
        </TechnicalDetails>
      </div>

      {config.requiresTopicContext ? (
        <fieldset
          id={`${editorId}-related-topics`}
          disabled={disabled}
          aria-invalid={Boolean(fieldErrors.relatedTopicIds)}
          aria-describedby={
            fieldErrors.relatedTopicIds ? errorId("relatedTopicIds") : undefined
          }
          className={inputClass(
            "relatedTopicIds",
            "border-line rounded-tile mt-4 border px-4 py-4 disabled:opacity-60",
          )}
        >
          <legend className="text-ink-70 px-1 text-[13px] font-semibold">
            Povezane teme
          </legend>
          <p className="text-ink-55 mb-3 text-[12px] leading-[1.5]">
            Veze stručni tim potvrđuje kroz pregled; sinonimi ih ne stvaraju
            automatski.
          </p>
          {availableRelatedTopics.length === 0 ? (
            <p className="text-ink-45 text-[12.5px] italic">
              Nema drugih aktivnih tema koje se mogu povezati.
            </p>
          ) : (
            <div className="grid max-h-[220px] gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
              {availableRelatedTopics.map((relatedTopic) => {
                const checked = draft.relatedTopicIds.includes(
                  relatedTopic.termId,
                );
                return (
                  <label
                    key={relatedTopic.termId}
                    className={cn(
                      "border-line-strong rounded-tile flex cursor-pointer items-start gap-2.5 border px-3 py-2.5 text-[12.5px] transition-colors",
                      checked
                        ? "border-sage bg-sage/8 text-forest"
                        : "text-ink-70 hover:border-coffee/35",
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => {
                        setField(
                          "relatedTopicIds",
                          checked
                            ? draft.relatedTopicIds.filter(
                                (id) => id !== relatedTopic.termId,
                              )
                            : [...draft.relatedTopicIds, relatedTopic.termId],
                        );
                        clearFieldError("relatedTopicIds");
                      }}
                      className="accent-forest mt-0.5 h-4 w-4 shrink-0"
                    />
                    <span>
                      <span className="block font-semibold">
                        {relatedTopic.publicLabel}
                        {relatedTopic.status === "archived"
                          ? " · arhivirano"
                          : ""}
                      </span>
                      <span className="text-ink-45 mt-0.5 block font-mono text-[10.5px]">
                        {relatedTopic.stableId}
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>
          )}
          <p className="text-ink-45 mt-2 text-right text-[11px]">
            Izabrano: {draft.relatedTopicIds.length}
          </p>
          <FieldError
            id={errorId("relatedTopicIds")}
            message={fieldErrors.relatedTopicIds}
          />
        </fieldset>
      ) : null}
    </>
  );
}
