"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { cn } from "@/helpers/cn";

import {
  COMPASS_CONTENT_FILTERS,
  compassContentRows,
  type CompassContentFilter,
} from "../../compass-content-view";
import { useCreateArticleMutation } from "../../hooks/use-compass-content";
import {
  contentErrorMessage,
  useContentEntriesQuery,
} from "../../hooks/use-content-entries";
import { useTaxonomyRegistryQuery } from "../../hooks/use-taxonomy-registry";
import { CompassContentCreate } from "./compass-content-create";
import { CompassContentRow } from "./compass-content-row";

/**
 * The Kompas „Sadržaj" tab (UX-0B).
 *
 * Was one paragraph and a link out to the CMS. It is now the screen that
 * answers "which of our content can Kompas actually recommend, and what is
 * missing on the rest" — over the endpoints the panel already had. Content is
 * never copied into Kompas: rows read the CMS entry and editing links back to
 * the CMS editor.
 */
export function CompassContentWorkspace() {
  const router = useRouter();
  const entriesQuery = useContentEntriesQuery();
  const registryQuery = useTaxonomyRegistryQuery();
  const createArticle = useCreateArticleMutation();

  const [filter, setFilter] = useState<CompassContentFilter>("all");
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);

  const entries = entriesQuery.data ?? [];
  const terms = registryQuery.data?.terms ?? [];
  const rows = compassContentRows(entries, terms, { filter, search });

  const loadError = entriesQuery.isError
    ? contentErrorMessage(
        entriesQuery.error,
        "Sadržaj se trenutno ne može učitati. Osvežite stranicu.",
      )
    : null;

  return (
    <div className="space-y-4">
      <div className="rounded-panel border-line bg-surface border px-6 py-5">
        <h2 className="text-forest font-serif text-[21px]">
          Sadržaj koji Kompas može da preporuči
        </h2>
        <p className="text-ink-55 mt-2 text-[13.5px] leading-[1.55]">
          Sadržaj se ne kopira u Kompas. Ovde vidite šta je povezano, šta još
          nije i šta tačno nedostaje; uređivanje ostaje u CMS editoru. Stranice
          terapeuta se ne prikazuju — njih vodi Vođeni izbor, ne Kompas.
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          {COMPASS_CONTENT_FILTERS.map((option) => (
            <button
              key={option.id}
              type="button"
              aria-pressed={filter === option.id}
              onClick={() => setFilter(option.id)}
              className={cn(
                "min-h-11 cursor-pointer rounded-full border px-4 text-[12.5px] font-semibold transition-colors",
                filter === option.id
                  ? "border-coffee bg-coffee text-panel-canvas"
                  : "border-line-strong text-ink-70 hover:border-coffee/40 bg-transparent",
              )}
            >
              {option.label}
            </button>
          ))}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-3">
          <label htmlFor="compass-content-search" className="sr-only">
            Pretraga sadržaja
          </label>
          <input
            id="compass-content-search"
            value={search}
            placeholder="Pretražite po naslovu, oblasti ili temi"
            onChange={(event) => setSearch(event.target.value)}
            className="border-line-strong rounded-tile bg-panel-canvas text-coffee focus:border-sage min-h-11 flex-1 border px-3.5 text-sm outline-none"
          />
          <button
            type="button"
            onClick={() => setCreating((open) => !open)}
            className="border-coffee text-coffee hover:bg-coffee/8 min-h-11 cursor-pointer rounded-full border px-5 text-[13px] font-semibold"
          >
            {creating ? "Zatvori" : "Dodaj novi sadržaj"}
          </button>
        </div>
      </div>

      {creating ? (
        <CompassContentCreate
          isPending={createArticle.isPending}
          takenSlugs={entries
            .filter((entry) => entry.contentType === "article")
            .map((entry) => entry.slug)}
          serverError={
            createArticle.isError
              ? contentErrorMessage(
                  createArticle.error,
                  "Članak nije napravljen. Pokušajte ponovo.",
                )
              : null
          }
          onCreate={(slug) =>
            createArticle.mutate(
              { slug },
              {
                onSuccess: (entry) =>
                  router.push(
                    `/radni-prostor/sadrzaj?entryId=${encodeURIComponent(entry.entryId)}&izvor=kompas`,
                  ),
              },
            )
          }
        />
      ) : null}

      {loadError ? (
        <div className="border-danger/45 bg-danger/8 rounded-panel border px-5 py-4">
          <p className="text-coffee text-[14.5px] font-semibold">
            Sadržaj se ne može učitati
          </p>
          <p className="text-ink-70 mt-1 text-[13px] leading-[1.5]">
            {loadError}
          </p>
        </div>
      ) : null}

      {entriesQuery.isLoading || registryQuery.isLoading ? (
        <p className="text-ink-55 text-[13.5px]">Učitavanje…</p>
      ) : rows.length === 0 ? (
        <p className="text-ink-55 rounded-panel border-line bg-surface border px-5 py-6 text-[13.5px]">
          Nema sadržaja koji odgovara ovom izboru.
        </p>
      ) : (
        rows.map((row) => <CompassContentRow key={row.entryId} row={row} />)
      )}
    </div>
  );
}
