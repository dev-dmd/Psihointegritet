"use client";

import { useQuery } from "@tanstack/react-query";

import {
  TAXONOMY_REGISTRY_QUERY_KEY,
  fetchTaxonomyRegistry,
  type TaxonomyAxis,
  type TaxonomyTerm,
} from "../taxonomy-api";
import type { ApiContentDiscovery } from "../content-api";

function selectedTerms(terms: TaxonomyTerm[], axis: TaxonomyAxis) {
  return terms.filter((term) => term.axis === axis && term.status === "published");
}

function CheckList({
  label,
  terms,
  selected,
  onChange,
  disabled,
}: {
  label: string;
  terms: TaxonomyTerm[];
  selected: string[];
  onChange: (next: string[]) => void;
  disabled: boolean;
}) {
  return (
    <fieldset className="mt-4">
      <legend className="text-coffee text-[13.5px] font-semibold">{label}</legend>
      {terms.length === 0 ? (
        <p className="text-ink-55 mt-1 text-[12.5px]">Još nema objavljenih vrednosti u Kompas registru.</p>
      ) : (
        <div className="mt-2 flex flex-wrap gap-2">
          {terms.map((term) => {
            const checked = selected.includes(term.termId);
            return (
              <label key={term.termId} className="border-line-strong has-[:checked]:border-forest has-[:checked]:bg-forest/8 flex cursor-pointer items-center gap-2 rounded-full border px-3 py-2 text-[12.5px] text-ink-70">
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={disabled}
                  onChange={() => onChange(checked ? selected.filter((id) => id !== term.termId) : [...selected, term.termId])}
                />
                {term.publicLabel}
              </label>
            );
          })}
        </div>
      )}
    </fieldset>
  );
}

export function ContentDiscoveryMetadataEditor({
  value,
  onChange,
  disabled,
}: {
  value: ApiContentDiscovery;
  onChange: (value: ApiContentDiscovery) => void;
  disabled: boolean;
}) {
  const registry = useQuery({
    queryKey: TAXONOMY_REGISTRY_QUERY_KEY,
    queryFn: () => fetchTaxonomyRegistry(),
    staleTime: 30_000,
    retry: false,
  });
  const terms = registry.data?.terms ?? [];
  const groups = selectedTerms(terms, "topic_group");
  const topics = selectedTerms(terms, "topic").filter(
    (term) => !value.topicGroupTermId || term.primaryParentTermId === value.topicGroupTermId,
  );
  const set = (patch: Partial<ApiContentDiscovery>) => onChange({ ...value, ...patch });

  return (
    <section className="border-line bg-panel-canvas rounded-tile mt-4 border px-4 py-3">
      <div className="text-coffee text-[14px] font-semibold">Kompas povezanost</div>
      <p className="text-ink-55 mt-1 text-[12.5px] leading-[1.5]">
        Birajte samo objavljene vrednosti iz Kompas registra. Ovi podaci određuju da li sadržaj može ući u buduće preporuke; nisu javni tehnički tagovi.
      </p>
      {registry.isLoading ? <p className="text-ink-55 mt-3 text-[12.5px]">Učitavanje kontrolisanih izbora…</p> : null}
      {registry.isError ? <p className="text-danger mt-3 text-[12.5px]">Kompas registar trenutno nije dostupan. Sačuvajte sadržaj kasnije sa njegovim metapodacima.</p> : null}
      {!registry.isLoading && !registry.isError ? <>
        <label className="mt-4 block text-[13.5px] font-semibold text-coffee">
          Kojim oblastima pripada ovaj sadržaj?
          <select
            value={value.topicGroupTermId ?? ""}
            disabled={disabled}
            onChange={(event) => set({ topicGroupTermId: event.target.value || null, topicTermIds: [] })}
            className="border-line-strong bg-surface mt-1.5 block w-full rounded-lg border px-3 py-2 text-sm font-normal text-ink-70"
          >
            <option value="">Izaberite oblast</option>
            {groups.map((term) => <option key={term.termId} value={term.termId}>{term.publicLabel}</option>)}
          </select>
        </label>
        <CheckList label="Koje konkretnije teme obuhvata?" terms={topics} selected={value.topicTermIds} onChange={(topicTermIds) => set({ topicTermIds })} disabled={disabled} />
        <CheckList label="Kome je prvenstveno namenjen?" terms={selectedTerms(terms, "audience")} selected={value.audienceTermIds} onChange={(audienceTermIds) => set({ audienceTermIds })} disabled={disabled} />
        <CheckList label="Šta korisnik može da dobije iz njega?" terms={selectedTerms(terms, "content_goal")} selected={value.contentGoalTermIds} onChange={(contentGoalTermIds) => set({ contentGoalTermIds })} disabled={disabled} />
        <SelectQuestion label="Da li je koristan nekome ko istražuje, traži stručnu podršku ili oboma?" terms={selectedTerms(terms, "journey_intent")} value={value.journeyIntentTermId} disabled={disabled} onChange={(journeyIntentTermId) => set({ journeyIntentTermId })} />
        <SelectQuestion label="U kom je formatu sadržaj?" terms={selectedTerms(terms, "content_format")} value={value.contentFormatTermId} disabled={disabled} onChange={(contentFormatTermId) => set({ contentFormatTermId })} />
        <SelectQuestion label="Ko može da mu pristupi?" terms={selectedTerms(terms, "access_level").filter((term) => term.stableId === "public")} value={value.accessLevelTermId} disabled={disabled} onChange={(accessLevelTermId) => set({ accessLevelTermId })} help="Trenutne CMS stranice imaju bezbedno sproveden samo javni pristup." />
      </> : null}
    </section>
  );
}

function SelectQuestion({ label, terms, value, onChange, disabled, help }: { label: string; terms: TaxonomyTerm[]; value: string | null; onChange: (value: string | null) => void; disabled: boolean; help?: string }) {
  return <label className="mt-4 block text-[13.5px] font-semibold text-coffee">{label}
    <select value={value ?? ""} disabled={disabled} onChange={(event) => onChange(event.target.value || null)} className="border-line-strong bg-surface mt-1.5 block w-full rounded-lg border px-3 py-2 text-sm font-normal text-ink-70">
      <option value="">Izaberite vrednost</option>
      {terms.map((term) => <option key={term.termId} value={term.termId}>{term.publicLabel}</option>)}
    </select>
    {help ? <span className="text-ink-55 mt-1 block text-[12px] font-normal">{help}</span> : null}
  </label>;
}
