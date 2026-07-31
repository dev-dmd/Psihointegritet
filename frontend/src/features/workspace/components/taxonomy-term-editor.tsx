"use client";

import { useMutation } from "@tanstack/react-query";
import type { FormEvent } from "react";
import { useState } from "react";

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
  const [validationError, setValidationError] = useState<string | null>(null);

  const areas = registryTerms.filter(
    (item) => item.axis === "topic_group" && item.status !== "archived",
  );
  const journeyIntents = registryTerms.filter(
    (item) => item.axis === "journey_intent" && item.status !== "archived",
  );

  const saveMutation = useMutation({
    mutationFn: async () => {
      const normalizedStableId = stableId.trim();
      const normalizedLabel = publicLabel.trim();
      const normalizedDescription = shortDescription.trim();

      if (term) {
        return updateTaxonomyRevision(term.termId, term.revisionId, {
          lockVersion: term.lockVersion,
          publicLabel: normalizedLabel,
          shortDescription: normalizedDescription,
          ...(config.requiresTopicContext
            ? {
                primaryParentTermId,
                journeyIntentTermId,
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
        sortOrder: 0,
        publicVisible: true,
        compassEnabled: true,
        ...(config.requiresTopicContext
          ? {
              primaryParentTermId,
              journeyIntentTermId,
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
