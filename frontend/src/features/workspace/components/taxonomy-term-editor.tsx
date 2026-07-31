"use client";

import { useMutation } from "@tanstack/react-query";
import type { FormEvent } from "react";
import { useState } from "react";

import { Toggle } from "@/components/panel/toggle";
import { cn } from "@/helpers/cn";

import {
  createTaxonomyTerm,
  TaxonomyApiError,
  type TaxonomyAxis,
  type TaxonomyTerm,
  updateTaxonomyRevision,
} from "../taxonomy-api";
import { LockIcon } from "./icons";

export type ManagedTaxonomyAxis = Extract<
  TaxonomyAxis,
  "topic_group" | "topic" | "audience" | "content_goal"
>;

interface AxisEditorConfig {
  newLabel: string;
  publicLabel: string;
  stableIdExample: string;
  requiresTopicContext: boolean;
}

export const AXIS_EDITOR_CONFIG: Record<ManagedTaxonomyAxis, AxisEditorConfig> =
  {
    topic_group: {
      newLabel: "Nova oblast",
      publicLabel: "Naziv oblasti",
      stableIdExample: "stress-overload",
      requiresTopicContext: false,
    },
    topic: {
      newLabel: "Nova tema",
      publicLabel: "Naziv teme",
      stableIdExample: "burnout",
      requiresTopicContext: true,
    },
    audience: {
      newLabel: "Nova publika",
      publicLabel: "Naziv publike",
      stableIdExample: "self",
      requiresTopicContext: false,
    },
    content_goal: {
      newLabel: "Novi cilj sadržaja",
      publicLabel: "Naziv cilja",
      stableIdExample: "understand",
      requiresTopicContext: false,
    },
  };

const STABLE_ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

type VisualMode = "none" | "icon" | "asset";

function initialVisualMode(term: TaxonomyTerm | null): VisualMode {
  if (term?.iconKey) return "icon";
  if (term?.assetId) return "asset";
  return "none";
}

function parseSearchTerms(value: string): string[] {
  const seen = new Set<string>();
  const values: string[] = [];
  for (const raw of value.split(/\r?\n|,/)) {
    const item = raw.trim();
    const normalized = item.toLocaleLowerCase("sr-Latn");
    if (!item || seen.has(normalized)) continue;
    seen.add(normalized);
    values.push(item);
  }
  return values;
}

interface TaxonomyTermEditorProps {
  axis: ManagedTaxonomyAxis;
  term: TaxonomyTerm | null;
  registryTerms: TaxonomyTerm[];
  onSaved: (term: TaxonomyTerm) => void;
  onCancel: () => void;
}

export function TaxonomyTermEditor({
  axis,
  term,
  registryTerms,
  onSaved,
  onCancel,
}: TaxonomyTermEditorProps) {
  const config = AXIS_EDITOR_CONFIG[axis];
  const [stableId, setStableId] = useState(term?.stableId ?? "");
  const [publicLabel, setPublicLabel] = useState(term?.publicLabel ?? "");
  const [shortDescription, setShortDescription] = useState(
    term?.shortDescription ?? "",
  );
  const [primaryParentTermId, setPrimaryParentTermId] = useState(
    term?.primaryParentTermId ?? "",
  );
  const [journeyIntentTermId, setJourneyIntentTermId] = useState(
    term?.journeyIntentTermId ?? "",
  );
  const [searchTermsText, setSearchTermsText] = useState(
    term?.searchTerms.join("\n") ?? "",
  );
  const [sortOrder, setSortOrder] = useState(String(term?.sortOrder ?? 0));
  const [internalExpertNote, setInternalExpertNote] = useState(
    term?.internalExpertNote ?? "",
  );
  const [visualMode, setVisualMode] = useState<VisualMode>(() =>
    initialVisualMode(term),
  );
  const [iconKey, setIconKey] = useState(term?.iconKey ?? "");
  const [assetId, setAssetId] = useState(term?.assetId ?? "");
  const [publicVisible, setPublicVisible] = useState(
    term?.publicVisible ?? true,
  );
  const [compassEnabled, setCompassEnabled] = useState(
    term?.compassEnabled ?? true,
  );
  const [relatedTopicIds, setRelatedTopicIds] = useState<string[]>(
    term?.relations
      .filter((relation) => relation.kind === "related_topic")
      .map((relation) => relation.targetTermId) ?? [],
  );
  const [validationError, setValidationError] = useState<string | null>(null);

  const areas = registryTerms.filter(
    (item) =>
      item.axis === "topic_group" &&
      (item.status !== "archived" || item.termId === primaryParentTermId),
  );
  const journeyIntents = registryTerms.filter(
    (item) =>
      item.axis === "journey_intent" &&
      (item.status !== "archived" || item.termId === journeyIntentTermId),
  );
  const availableRelatedTopics = registryTerms.filter(
    (item) =>
      item.axis === "topic" &&
      (item.status !== "archived" || relatedTopicIds.includes(item.termId)) &&
      item.termId !== term?.termId,
  );

  const saveMutation = useMutation({
    mutationFn: async () => {
      const normalizedStableId = stableId.trim();
      const normalizedLabel = publicLabel.trim();
      const normalizedDescription = shortDescription.trim();
      const normalizedInternalNote = internalExpertNote.trim() || null;
      const normalizedIconKey =
        visualMode === "icon" ? iconKey.trim() || null : null;
      const normalizedAssetId =
        visualMode === "asset" ? assetId.trim() || null : null;
      const normalizedSearchTerms = parseSearchTerms(searchTermsText);
      const normalizedSortOrder = Number(sortOrder);

      if (term) {
        return updateTaxonomyRevision(term.termId, term.revisionId, {
          lockVersion: term.lockVersion,
          publicLabel: normalizedLabel,
          shortDescription: normalizedDescription,
          internalExpertNote: normalizedInternalNote,
          sortOrder: normalizedSortOrder,
          iconKey: normalizedIconKey,
          assetId: normalizedAssetId,
          publicVisible,
          compassEnabled,
          searchTerms: normalizedSearchTerms,
          ...(config.requiresTopicContext
            ? {
                primaryParentTermId,
                journeyIntentTermId,
                relatedTopicIds,
              }
            : {}),
        });
      }

      return createTaxonomyTerm({
        axis,
        stableId: normalizedStableId,
        locale: "sr-Latn",
        publicLabel: normalizedLabel,
        shortDescription: normalizedDescription,
        internalExpertNote: normalizedInternalNote,
        sortOrder: normalizedSortOrder,
        iconKey: normalizedIconKey,
        assetId: normalizedAssetId,
        publicVisible,
        compassEnabled,
        searchTerms: normalizedSearchTerms,
        ...(config.requiresTopicContext
          ? {
              primaryParentTermId,
              journeyIntentTermId,
              relatedTopicIds,
            }
          : {}),
      });
    },
    onSuccess: onSaved,
  });

  const mutationError = saveMutation.isError
    ? saveMutation.error instanceof TaxonomyApiError
      ? saveMutation.error.message
      : saveMutation.error instanceof Error
        ? saveMutation.error.message
        : "Izmena nije sačuvana. Pokušajte ponovo."
    : null;
  const error = validationError ?? mutationError;
  const editorId = `taxonomy-${axis}-${term?.termId ?? "new"}`;
  const searchTermCount = parseSearchTerms(searchTermsText).length;

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setValidationError(null);
    if (!publicLabel.trim()) {
      setValidationError(`${config.publicLabel} je obavezan.`);
      return;
    }
    if (!term && !STABLE_ID_PATTERN.test(stableId.trim())) {
      setValidationError(
        `Stabilni ID koristi mala ASCII slova, brojeve i crtice, na primer ${config.stableIdExample}.`,
      );
      return;
    }
    if (config.requiresTopicContext && !primaryParentTermId) {
      setValidationError("Izaberite oblast kojoj tema pripada.");
      return;
    }
    if (config.requiresTopicContext && !journeyIntentTermId) {
      setValidationError("Izaberite put korisnika za ovu temu.");
      return;
    }
    const normalizedSearchTerms = parseSearchTerms(searchTermsText);
    if (normalizedSearchTerms.length > 100) {
      setValidationError(
        "Možete uneti najviše 100 sinonima i pojmova za pretragu.",
      );
      return;
    }
    if (normalizedSearchTerms.some((item) => item.length > 160)) {
      setValidationError(
        "Jedan sinonim ili pojam može imati najviše 160 karaktera.",
      );
      return;
    }
    const normalizedSortOrder = Number(sortOrder);
    if (
      !sortOrder.trim() ||
      !Number.isInteger(normalizedSortOrder) ||
      normalizedSortOrder < 0 ||
      normalizedSortOrder > 100_000
    ) {
      setValidationError("Redosled mora biti ceo broj između 0 i 100000.");
      return;
    }
    if (relatedTopicIds.length > 100) {
      setValidationError("Možete povezati najviše 100 tema.");
      return;
    }
    if (visualMode === "icon" && !iconKey.trim()) {
      setValidationError(
        "Unesite ključ ikone ili izaberite drugi vizuelni režim.",
      );
      return;
    }
    if (visualMode === "asset" && !assetId.trim()) {
      setValidationError(
        "Unesite ID asseta ili izaberite drugi vizuelni režim.",
      );
      return;
    }
    saveMutation.mutate();
  };

  return (
    <form
      onSubmit={submit}
      className="rounded-panel border-sage/55 bg-surface mb-5 border px-5 py-5 md:px-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-ink-45 text-[10.5px] font-semibold tracking-[0.12em] uppercase">
            {term ? "Uređivanje radne verzije" : "Nova vrednost registra"}
          </div>
          <h3 className="text-forest mt-1 font-serif text-[21px]">
            {term ? `Uredi: ${term.publicLabel}` : config.newLabel}
          </h3>
        </div>
        {term ? (
          <span className="bg-badge-neutral-bg text-badge-neutral rounded-full px-2.5 py-1 text-[11.5px] font-semibold">
            {term.versionLabel}
          </span>
        ) : null}
      </div>

      {error ? (
        <div
          role="alert"
          className="border-danger/45 bg-danger/8 text-ink-70 rounded-tile mt-4 border px-4 py-3 text-[13px] leading-[1.5]"
        >
          {error}
        </div>
      ) : null}

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
            value={publicLabel}
            maxLength={160}
            disabled={saveMutation.isPending}
            onChange={(event) => {
              setPublicLabel(event.target.value);
              setValidationError(null);
            }}
            className="border-line-strong rounded-tile bg-panel-canvas text-coffee focus:border-sage w-full border px-3.5 py-2.5 text-sm outline-none disabled:opacity-60"
          />
          <p className="text-ink-45 mt-1 text-right text-[11px]">
            {publicLabel.length}/160
          </p>
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
              value={stableId}
              maxLength={80}
              disabled={saveMutation.isPending}
              placeholder={config.stableIdExample}
              onChange={(event) => {
                setStableId(event.target.value);
                setValidationError(null);
              }}
              className="border-line-strong rounded-tile bg-panel-canvas text-coffee focus:border-sage w-full border px-3.5 py-2.5 font-mono text-sm outline-none disabled:opacity-60"
            />
          )}
          <p className="text-ink-55 mt-1.5 text-[12px]">
            {term
              ? "Zaključan je nakon kreiranja i koristi se za veze i preporuke."
              : "Postavlja se jednom i kasnije se ne menja. Ne koristi javni URL."}
          </p>
        </div>
      </div>

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
              value={primaryParentTermId}
              disabled={saveMutation.isPending || areas.length === 0}
              onChange={(event) => {
                setPrimaryParentTermId(event.target.value);
                setValidationError(null);
              }}
              className="border-line-strong rounded-tile bg-panel-canvas text-coffee focus:border-sage w-full border px-3.5 py-2.5 text-sm outline-none disabled:opacity-60"
            >
              <option value="">Izaberite oblast</option>
              {areas.map((area) => (
                <option key={area.termId} value={area.termId}>
                  {area.publicLabel}
                  {area.status === "archived" ? " · arhivirano" : ""}
                </option>
              ))}
            </select>
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
              Da li tema vodi ka istraživanju, stručnoj podršci ili oba puta?
            </label>
            <select
              id={`${editorId}-journey`}
              value={journeyIntentTermId}
              disabled={saveMutation.isPending || journeyIntents.length === 0}
              onChange={(event) => {
                setJourneyIntentTermId(event.target.value);
                setValidationError(null);
              }}
              className="border-line-strong rounded-tile bg-panel-canvas text-coffee focus:border-sage w-full border px-3.5 py-2.5 text-sm outline-none disabled:opacity-60"
            >
              <option value="">Izaberite put korisnika</option>
              {journeyIntents.map((journey) => (
                <option key={journey.termId} value={journey.termId}>
                  {journey.publicLabel}
                  {journey.status === "archived" ? " · arhivirano" : ""}
                </option>
              ))}
            </select>
            <p className="text-ink-55 mt-1.5 text-[12px]">
              Bira se sistemska vrednost; njeno značenje se ovde ne menja.
            </p>
          </div>
        </div>
      ) : null}

      <div className="mt-4">
        <label
          htmlFor={`${editorId}-description`}
          className="text-ink-70 mb-1.5 block text-[13px] font-semibold"
        >
          Kratak javni opis
        </label>
        <textarea
          id={`${editorId}-description`}
          value={shortDescription}
          maxLength={500}
          rows={4}
          disabled={saveMutation.isPending}
          onChange={(event) => {
            setShortDescription(event.target.value);
            setValidationError(null);
          }}
          className="border-line-strong rounded-tile bg-panel-canvas text-coffee focus:border-sage w-full resize-y border px-3.5 py-2.5 text-sm leading-[1.55] outline-none disabled:opacity-60"
        />
        <p className="text-ink-45 mt-1 text-right text-[11px]">
          {shortDescription.length}/500
        </p>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_180px]">
        <div>
          <label
            htmlFor={`${editorId}-search-terms`}
            className="text-ink-70 mb-1.5 block text-[13px] font-semibold"
          >
            Sinonimi i pojmovi za pretragu
          </label>
          <textarea
            id={`${editorId}-search-terms`}
            value={searchTermsText}
            maxLength={16_100}
            rows={4}
            disabled={saveMutation.isPending}
            placeholder={
              axis === "topic"
                ? "sagorevanje\nprofesionalna iscrpljenost"
                : "Jedan pojam u svakom redu"
            }
            onChange={(event) => {
              setSearchTermsText(event.target.value);
              setValidationError(null);
            }}
            className="border-line-strong rounded-tile bg-panel-canvas text-coffee focus:border-sage w-full resize-y border px-3.5 py-2.5 text-sm leading-[1.55] outline-none disabled:opacity-60"
          />
          <div className="text-ink-55 mt-1.5 flex flex-wrap justify-between gap-2 text-[12px]">
            <span>Jedan pojam po redu ili odvojen zarezom.</span>
            <span>{searchTermCount}/100</span>
          </div>
        </div>

        <div>
          <label
            htmlFor={`${editorId}-sort-order`}
            className="text-ink-70 mb-1.5 block text-[13px] font-semibold"
          >
            Redosled prikaza
          </label>
          <input
            id={`${editorId}-sort-order`}
            type="number"
            min={0}
            max={100_000}
            step={1}
            value={sortOrder}
            disabled={saveMutation.isPending}
            onChange={(event) => {
              setSortOrder(event.target.value);
              setValidationError(null);
            }}
            className="border-line-strong rounded-tile bg-panel-canvas text-coffee focus:border-sage w-full border px-3.5 py-2.5 text-sm outline-none disabled:opacity-60"
          />
          <p className="text-ink-55 mt-1.5 text-[12px] leading-[1.45]">
            Manji broj se prikazuje ranije. Isti broj se razrešava po nazivu.
          </p>
        </div>
      </div>

      {config.requiresTopicContext ? (
        <fieldset
          disabled={saveMutation.isPending}
          className="border-line rounded-tile mt-4 border px-4 py-4 disabled:opacity-60"
        >
          <legend className="text-ink-70 px-1 text-[13px] font-semibold">
            Povezane teme
          </legend>
          <p className="text-ink-55 mb-3 text-[12px] leading-[1.5]">
            Ovde se evidentiraju veze koje stručni tim potvrđuje kroz pregled.
            Sinonimi ne stvaraju ovu vezu automatski.
          </p>
          {availableRelatedTopics.length === 0 ? (
            <p className="text-ink-45 text-[12.5px] italic">
              Nema drugih aktivnih tema koje se mogu povezati.
            </p>
          ) : (
            <div className="grid max-h-[220px] gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
              {availableRelatedTopics.map((relatedTopic) => {
                const checked = relatedTopicIds.includes(relatedTopic.termId);
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
                        setRelatedTopicIds((current) =>
                          checked
                            ? current.filter((id) => id !== relatedTopic.termId)
                            : [...current, relatedTopic.termId],
                        );
                        setValidationError(null);
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
            Izabrano: {relatedTopicIds.length}
          </p>
        </fieldset>
      ) : null}

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
              aria-pressed={visualMode === mode}
              disabled={saveMutation.isPending}
              onClick={() => {
                setVisualMode(mode);
                setValidationError(null);
              }}
              className={cn(
                "cursor-pointer rounded-full border px-3.5 py-2 text-[12.5px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50",
                visualMode === mode
                  ? "border-coffee bg-coffee text-panel-canvas"
                  : "border-line-strong text-ink-70 hover:border-coffee/40 bg-transparent",
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {visualMode === "icon" ? (
          <div className="mt-3 max-w-[460px]">
            <label
              htmlFor={`${editorId}-icon-key`}
              className="text-ink-70 mb-1.5 block text-[12.5px] font-semibold"
            >
              Ključ ikone
            </label>
            <input
              id={`${editorId}-icon-key`}
              value={iconKey}
              maxLength={120}
              disabled={saveMutation.isPending}
              placeholder="sparkles"
              onChange={(event) => {
                setIconKey(event.target.value);
                setValidationError(null);
              }}
              className="border-line-strong rounded-tile bg-panel-canvas text-coffee focus:border-sage w-full border px-3.5 py-2.5 font-mono text-sm outline-none disabled:opacity-60"
            />
            <p className="text-ink-55 mt-1.5 text-[12px]">
              Koristi ključ iz odobrenog seta ikona interfejsa.
            </p>
          </div>
        ) : null}

        {visualMode === "asset" ? (
          <div className="mt-3 max-w-[460px]">
            <label
              htmlFor={`${editorId}-asset-id`}
              className="text-ink-70 mb-1.5 block text-[12.5px] font-semibold"
            >
              ID postojećeg asseta
            </label>
            <input
              id={`${editorId}-asset-id`}
              value={assetId}
              maxLength={191}
              disabled={saveMutation.isPending}
              placeholder="asset-id"
              onChange={(event) => {
                setAssetId(event.target.value);
                setValidationError(null);
              }}
              className="border-line-strong rounded-tile bg-panel-canvas text-coffee focus:border-sage w-full border px-3.5 py-2.5 font-mono text-sm outline-none disabled:opacity-60"
            />
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
            checked={publicVisible}
            disabled={saveMutation.isPending}
            label="Javno vidljivo"
            onChange={(checked) => {
              setPublicVisible(checked);
              setValidationError(null);
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
            checked={compassEnabled}
            disabled={saveMutation.isPending}
            label="Aktivno u Kompasu"
            onChange={(checked) => {
              setCompassEnabled(checked);
              setValidationError(null);
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
          value={internalExpertNote}
          maxLength={4_000}
          rows={5}
          disabled={saveMutation.isPending}
          onChange={(event) => {
            setInternalExpertNote(event.target.value);
            setValidationError(null);
          }}
          className="border-line-strong rounded-tile bg-panel-canvas text-coffee focus:border-sage w-full resize-y border px-3.5 py-2.5 text-sm leading-[1.55] outline-none disabled:opacity-60"
        />
        <div className="text-ink-55 mt-1.5 flex flex-wrap justify-between gap-2 text-[12px]">
          <span>Vidljiva je samo osoblju i nikada ne ulazi u javni API.</span>
          <span>{internalExpertNote.length}/4000</span>
        </div>
      </div>

      <div className="border-line mt-5 flex flex-wrap gap-2.5 border-t pt-4">
        <button
          type="submit"
          disabled={saveMutation.isPending}
          className="bg-forest text-panel-canvas hover:bg-forest-hover cursor-pointer rounded-full border-0 px-5 py-2.5 text-[13px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saveMutation.isPending
            ? "Čuvanje…"
            : term
              ? "Sačuvaj izmene"
              : "Sačuvaj radnu verziju"}
        </button>
        <button
          type="button"
          disabled={saveMutation.isPending}
          onClick={onCancel}
          className="border-line-strong text-ink-70 hover:border-coffee/40 cursor-pointer rounded-full border bg-transparent px-5 py-2.5 text-[13px] font-semibold disabled:cursor-not-allowed disabled:opacity-50"
        >
          Odustani
        </button>
      </div>
    </form>
  );
}
