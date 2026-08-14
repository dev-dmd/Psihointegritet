"use client";

import Link from "next/link";
import { useState } from "react";

import { cn } from "@/helpers/cn";
import { localizedPath } from "@/lib/routes/localized-path";
import { useUiLocale } from "@/i18n/use-ui-locale";
import { useUserSafeError } from "@/lib/errors/use-user-safe-error";

import {
  KOMPAS_CONTENT_FILTERS,
  kompasArticleRows,
  type KompasContentFilter,
} from "../../kompas-content-list-view";
import { useContentEntriesQuery } from "../../hooks/use-content-entries";
import { useTaxonomyRegistryQuery } from "../../hooks/use-taxonomy-registry";
import { KompasContentRow } from "./kompas-content-row";

/**
 * „Kompas → Sadržaj" as its own screen (D-063).
 *
 * Lists what the team has written, and nothing else. Pages of the site —
 * services, programs, packages, company plans — are edited in „Sadržaj"; they
 * were never Kompas material and offering to link one here was an action with
 * no meaning for the author.
 */
export function KompasContentList() {
  const locale = useUiLocale();
  const safeError = useUserSafeError();
  const entriesQuery = useContentEntriesQuery();
  const registryQuery = useTaxonomyRegistryQuery();

  const [filter, setFilter] = useState<KompasContentFilter>("all");
  const [search, setSearch] = useState("");

  const rows = kompasArticleRows(
    entriesQuery.data ?? [],
    registryQuery.data?.terms ?? [],
    { filter, search },
  );

  const loadError = entriesQuery.isError
    ? safeError.text(entriesQuery.error, "content", "load")
    : null;

  return (
    <section className="animate-fade-up">
      <p className="text-ink-55 mb-4 text-[13.5px] leading-[1.55]">
        Tekstovi koje piše stručni tim. Oblast i temu birate ili pravite dok
        pišete — ne morate ih pripremati unapred. Stranice sajta (usluge,
        programi, paketi) uređuju se u „Sadržaj”.
      </p>

      <div className="rounded-panel border-line bg-surface mb-4 border px-5 py-4">
        <div className="flex flex-wrap items-center gap-2">
          {KOMPAS_CONTENT_FILTERS.map((option) => (
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
          <label htmlFor="kompas-content-search" className="sr-only">
            Pretraga tekstova
          </label>
          <input
            id="kompas-content-search"
            value={search}
            placeholder="Pretražite po naslovu, oblasti ili temi"
            onChange={(event) => setSearch(event.target.value)}
            className="border-line-strong rounded-tile bg-panel-canvas text-coffee focus:border-sage min-h-11 flex-1 border px-3.5 text-sm outline-none"
          />
          <Link
            href={localizedPath("workspace.compass.content.new", { locale })}
            className="border-coffee bg-coffee text-panel-canvas inline-flex min-h-11 items-center rounded-full border px-5 text-[13px] font-semibold"
          >
            Novi sadržaj
          </Link>
        </div>
      </div>

      {loadError ? (
        <div className="border-danger/45 bg-danger/8 rounded-panel mb-4 border px-5 py-4">
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
        <div className="rounded-panel border-line bg-surface border px-5 py-8 text-center">
          <p className="text-forest font-serif text-[18px]">
            Još nema nijednog teksta
          </p>
          <p className="text-ink-55 mx-auto mt-2 max-w-[420px] text-[13px] leading-[1.55]">
            Krenite od „Novi sadržaj”. Oblast i temu birate ili pravite usput —
            ne morate ih pripremati unapred.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {rows.map((row) => (
            <KompasContentRow key={row.entryId} row={row} />
          ))}
        </div>
      )}
    </section>
  );
}
