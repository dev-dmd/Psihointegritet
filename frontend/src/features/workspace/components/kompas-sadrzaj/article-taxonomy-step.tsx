"use client";

import { type ChangeEvent, useCallback, useMemo, useState } from "react";

import type { ApiContentDiscovery } from "../../content-api";
import {
  type CreateTaxonomyTermInput,
  type TaxonomyTerm,
} from "../../taxonomy-api";
import {
  taxonomyErrorMessage,
  useSaveTaxonomyTermMutation,
  useTaxonomyRegistryLookupQuery,
  useTaxonomyRegistryCache,
} from "../../hooks/use-taxonomy-registry";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const AXIS_GROUP = "topic_group";
const AXIS_TOPIC = "topic";

function filterGroupTerms(terms: readonly TaxonomyTerm[]): TaxonomyTerm[] {
  return terms.filter(
    (term) => term.axis === AXIS_GROUP && term.status !== "archived",
  );
}

function filterTopicTerms(
  terms: readonly TaxonomyTerm[],
  parentTermId: string | null,
): TaxonomyTerm[] {
  return terms.filter(
    (term) =>
      term.axis === AXIS_TOPIC &&
      term.status !== "archived" &&
      term.primaryParentTermId === parentTermId,
  );
}

/** Strips diacritics and produces a lowercase kebab-case slug. */
function slugFromLabel(label: string): string {
  return label
    .toLowerCase()
    .replace(/[đ]/g, "dj")
    .replace(/[ć]/g, "c")
    .replace(/[čš]/g, (ch) => (ch === "č" ? "c" : "s"))
    .replace(/[ž]/g, "z")
    .replace(/ /g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Builds a minimal CreateTaxonomyTermInput for a new area.
 */
function createAreaInput(
  label: string,
  description: string,
  searchTerms: string[],
): CreateTaxonomyTermInput {
  return {
    stableId: slugFromLabel(label),
    publicLabel: label,
    shortDescription: description,
    axis: AXIS_GROUP,
    locale: "sr-Latn",
    searchTerms,
    compassEnabled: true,
    publicVisible: true,
    sortOrder: 0,
  };
}

/**
 * Builds a minimal CreateTaxonomyTermInput for a new topic.
 */
function createTopicInput(
  label: string,
  description: string,
  parentTermId: string,
  searchTerms: string[],
): CreateTaxonomyTermInput {
  return {
    stableId: slugFromLabel(label),
    publicLabel: label,
    shortDescription: description,
    axis: AXIS_TOPIC,
    locale: "sr-Latn",
    primaryParentTermId: parentTermId,
    searchTerms,
    compassEnabled: true,
    publicVisible: true,
    sortOrder: 0,
  };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ArticleTaxonomyStep({
  discovery,
  onChange,
}: {
  discovery: ApiContentDiscovery;
  onChange: (next: ApiContentDiscovery) => void;
}) {
  // ── Registry ─────────────────────────────────────────────────────────
  const registry = useTaxonomyRegistryLookupQuery();
  const cache = useTaxonomyRegistryCache();

  const groupTerms = useMemo(
    () => (registry.data ? filterGroupTerms(registry.data.terms) : []),
    [registry.data],
  );
  const selectedGroup = groupTerms.find(
    (term) => term.termId === discovery.topicGroupTermId,
  );

  const topicTerms = useMemo(
    () =>
      registry.data
        ? filterTopicTerms(registry.data.terms, discovery.topicGroupTermId)
        : [],
    [registry.data, discovery.topicGroupTermId],
  );

  // ── Inline-create state ──────────────────────────────────────────────
  const [creatingArea, setCreatingArea] = useState(false);
  const [creatingTopic, setCreatingTopic] = useState(false);

  const [newAreaLabel, setNewAreaLabel] = useState("");
  const [newAreaDesc, setNewAreaDesc] = useState("");
  const [newAreaTerms, setNewAreaTerms] = useState("");

  const [newTopicLabel, setNewTopicLabel] = useState("");
  const [newTopicDesc, setNewTopicDesc] = useState("");
  const [newTopicTerms, setNewTopicTerms] = useState("");

  // ── Mutations ────────────────────────────────────────────────────────
  const saveTerm = useSaveTaxonomyTermMutation({
    onSaved: (saved) => {
      cache.upsertTerm(saved);
      if (saved.axis === AXIS_GROUP) {
        onChange({
          ...discovery,
          topicGroupTermId: saved.termId,
          topicTermIds: [],
        });
        setCreatingArea(false);
      } else {
        onChange({
          ...discovery,
          topicTermIds: [...discovery.topicTermIds, saved.termId],
        });
        setCreatingTopic(false);
      }
    },
    onFailed: () => {
      // Error is surfaced by the mutation's isError + error fields — the
      // parent editor's fail() path catches it through usePanelErrors.
    },
  });

  // ── Handlers ─────────────────────────────────────────────────────────
  const selectArea = useCallback(
    (event: ChangeEvent<HTMLSelectElement>) => {
      const id = event.target.value || null;
      onChange({
        ...discovery,
        topicGroupTermId: id,
        topicTermIds: [], // Reset topics when area changes
      });
    },
    [discovery, onChange],
  );

  const toggleTopic = useCallback(
    (termId: string) => {
      const exists = discovery.topicTermIds.includes(termId);
      const next = exists
        ? discovery.topicTermIds.filter((id) => id !== termId)
        : [...discovery.topicTermIds, termId];
      onChange({ ...discovery, topicTermIds: next });
    },
    [discovery, onChange],
  );

  const commitArea = useCallback(() => {
    const label = newAreaLabel.trim();
    if (!label) return;
    const desc = newAreaDesc.trim();
    const search = newAreaTerms
      .split(/[,;]/)
      .map((s) => s.trim())
      .filter(Boolean);
    // Check for duplicate before creating
    const exists = groupTerms.find(
      (term) => term.publicLabel.toLowerCase() === label.toLowerCase(),
    );
    if (exists) {
      onChange({
        ...discovery,
        topicGroupTermId: exists.termId,
        topicTermIds: [],
      });
      setCreatingArea(false);
      setNewAreaLabel("");
      setNewAreaDesc("");
      setNewAreaTerms("");
      return;
    }
    saveTerm.mutate({
      create: createAreaInput(label, desc, search),
      update: null,
    });
  }, [
    newAreaLabel,
    newAreaDesc,
    newAreaTerms,
    groupTerms,
    discovery,
    onChange,
    saveTerm,
  ]);

  const commitTopic = useCallback(() => {
    const label = newTopicLabel.trim();
    if (!label || !discovery.topicGroupTermId) return;
    const desc = newTopicDesc.trim();
    const search = newTopicTerms
      .split(/[,;]/)
      .map((s) => s.trim())
      .filter(Boolean);
    // Check for duplicate
    const exists = topicTerms.find(
      (term) => term.publicLabel.toLowerCase() === label.toLowerCase(),
    );
    if (exists) {
      onChange({
        ...discovery,
        topicTermIds: [...new Set([...discovery.topicTermIds, exists.termId])],
      });
      setCreatingTopic(false);
      setNewTopicLabel("");
      setNewTopicDesc("");
      setNewTopicTerms("");
      return;
    }
    saveTerm.mutate({
      create: createTopicInput(label, desc, discovery.topicGroupTermId, search),
      update: null,
    });
  }, [
    newTopicLabel,
    newTopicDesc,
    newTopicTerms,
    topicTerms,
    discovery,
    onChange,
    saveTerm,
  ]);

  const isSaving = saveTerm.isPending;
  const saveError = saveTerm.isError
    ? taxonomyErrorMessage(
        saveTerm.error,
        "Nije uspelo kreiranje novog termina.",
      )
    : null;

  // ── Input classes ────────────────────────────────────────────────────
  const inputClass =
    "border-line-strong text-ink-90 bg-surface focus-visible:ring-coffee rounded-full border px-4 py-2 text-[13px] placeholder:text-ink-45 focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:outline-none";
  const selectClass = inputClass;

  return (
    <section
      id="compass-step-taxonomy"
      className="rounded-panel border-line scroll-mt-24 border px-6 py-5"
    >
      <h2 className="text-forest font-serif text-[17px]">Oblast i teme</h2>
      <p className="text-ink-55 mt-1 text-[12.5px] leading-[1.55]">
        Gde ovaj tekst pripada? Oblast i teme govore Kompasu kada da predloži
        tekst posetiocima koji traže baš ove pojmove.
      </p>

      {/* ── Registry loading / error ─────────────────────────────────── */}
      {registry.isLoading ? (
        <p className="text-ink-55 mt-4 text-[13px]">Učitavanje registra…</p>
      ) : registry.isError ? (
        <p className="text-ink-55 mt-4 text-[12.5px] leading-[1.5]">
          Nije moguće učitati registar oblasti i tema. Možete nastaviti da
          pišete — registar je potreban tek za slanje na pregled.
        </p>
      ) : (
        <div className="mt-4 flex flex-col gap-5">
          {/* ── Area ─────────────────────────────────────────────────── */}
          <div className="flex flex-col gap-1.5">
            <label className="text-ink-70 text-[13px] font-medium">
              Oblast
            </label>

            {!creatingArea ? (
              <>
                <select
                  value={discovery.topicGroupTermId ?? ""}
                  onChange={selectArea}
                  className={selectClass}
                >
                  <option value="">Izaberite postojeću oblast…</option>
                  {groupTerms.map((term) => (
                    <option key={term.termId} value={term.termId}>
                      {term.publicLabel}
                    </option>
                  ))}
                </select>
                {discovery.topicGroupTermId ? (
                  <p className="text-ink-45 text-[11px]">
                    {selectedGroup?.termId ? null : "Nepoznata oblast. "}
                    <button
                      type="button"
                      onClick={() => {
                        setNewAreaLabel(selectedGroup?.publicLabel ?? "");
                        setCreatingArea(true);
                      }}
                      className="text-forest cursor-pointer underline"
                    >
                      Kreirajte novu oblast ako ne postoji odgovarajuća
                    </button>
                  </p>
                ) : (
                  <p className="text-ink-45 text-[11px]">
                    Ne postoji odgovarajuća oblast?{" "}
                    <button
                      type="button"
                      onClick={() => setCreatingArea(true)}
                      className="text-forest cursor-pointer underline"
                    >
                      Kreiraj novu oblast
                    </button>
                  </p>
                )}
              </>
            ) : (
              <div className="rounded-tile border-line bg-surface flex flex-col gap-3 border px-4 py-3">
                <p className="text-forest text-[13px] font-semibold">
                  Nova oblast
                </p>
                <input
                  type="text"
                  value={newAreaLabel}
                  onChange={(e) => setNewAreaLabel(e.target.value)}
                  placeholder="Naziv oblasti"
                  className={inputClass}
                  disabled={isSaving}
                />
                <input
                  type="text"
                  value={newAreaDesc}
                  onChange={(e) => setNewAreaDesc(e.target.value)}
                  placeholder="Kratak opis"
                  className={inputClass}
                  disabled={isSaving}
                />
                <input
                  type="text"
                  value={newAreaTerms}
                  onChange={(e) => setNewAreaTerms(e.target.value)}
                  placeholder="Izrazi za pretragu, odvojeni zarezom"
                  className={inputClass}
                  disabled={isSaving}
                />
                {saveError ? (
                  <p className="text-danger text-[12px]">{saveError}</p>
                ) : null}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={isSaving || !newAreaLabel.trim()}
                    onClick={commitArea}
                    className="border-forest bg-forest text-panel-canvas min-h-10 cursor-pointer rounded-full border px-4 text-[12px] font-semibold disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSaving ? "Čuvanje…" : "Sačuvaj oblast"}
                  </button>
                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={() => setCreatingArea(false)}
                    className="text-ink-55 cursor-pointer text-[12px] underline"
                  >
                    Odustani
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ── Topics ────────────────────────────────────────────────── */}
          {discovery.topicGroupTermId ? (
            <div className="flex flex-col gap-1.5">
              <label className="text-ink-70 text-[13px] font-medium">
                Teme
              </label>

              {topicTerms.length === 0 ? (
                <p className="text-ink-45 text-[12px]">
                  Ova oblast još nema objavljenih tema.
                </p>
              ) : (
                <div className="flex flex-col gap-1">
                  {topicTerms.map((term) => {
                    const checked = discovery.topicTermIds.includes(
                      term.termId,
                    );
                    return (
                      <label
                        key={term.termId}
                        className="text-ink-70 hover:bg-surface border-line rounded-tile flex cursor-pointer items-center gap-2 border px-3 py-2 text-[13px] transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleTopic(term.termId)}
                          className="accent-forest h-4 w-4"
                        />
                        {term.publicLabel}
                        {term.shortDescription ? (
                          <span className="text-ink-45 ml-1 text-[11px]">
                            — {term.shortDescription}
                          </span>
                        ) : null}
                      </label>
                    );
                  })}
                </div>
              )}

              {!creatingTopic ? (
                <button
                  type="button"
                  onClick={() => setCreatingTopic(true)}
                  className="text-forest cursor-pointer self-start text-[12px] font-medium underline"
                >
                  {topicTerms.length === 0
                    ? "Kreiraj prvu temu"
                    : "+ Kreiraj novu temu"}
                </button>
              ) : (
                <div className="rounded-tile border-line bg-surface mt-1 flex flex-col gap-3 border px-4 py-3">
                  <p className="text-forest text-[13px] font-semibold">
                    Nova tema
                  </p>
                  <input
                    type="text"
                    value={newTopicLabel}
                    onChange={(e) => setNewTopicLabel(e.target.value)}
                    placeholder="Naziv teme"
                    className={inputClass}
                    disabled={isSaving}
                  />
                  <input
                    type="text"
                    value={newTopicDesc}
                    onChange={(e) => setNewTopicDesc(e.target.value)}
                    placeholder="Kratak opis"
                    className={inputClass}
                    disabled={isSaving}
                  />
                  <input
                    type="text"
                    value={newTopicTerms}
                    onChange={(e) => setNewTopicTerms(e.target.value)}
                    placeholder="Izrazi za pretragu, odvojeni zarezom"
                    className={inputClass}
                    disabled={isSaving}
                  />
                  {saveError ? (
                    <p className="text-danger text-[12px]">{saveError}</p>
                  ) : null}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={isSaving || !newTopicLabel.trim()}
                      onClick={commitTopic}
                      className="border-forest bg-forest text-panel-canvas min-h-10 cursor-pointer rounded-full border px-4 text-[12px] font-semibold disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isSaving ? "Čuvanje…" : "Sačuvaj temu"}
                    </button>
                    <button
                      type="button"
                      disabled={isSaving}
                      onClick={() => setCreatingTopic(false)}
                      className="text-ink-55 cursor-pointer text-[12px] underline"
                    >
                      Odustani
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-ink-45 text-[12px]">
              Prvo izaberite oblast, pa ćete videti dostupne teme za nju.
            </p>
          )}
        </div>
      )}
    </section>
  );
}
