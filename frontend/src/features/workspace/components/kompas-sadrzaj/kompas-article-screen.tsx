"use client";

import Link from "next/link";

import {
  contentErrorMessage,
  useContentEntriesQuery,
} from "../../hooks/use-content-entries";
import { KompasArticleEditor } from "./kompas-article-editor";
import { localizedPath } from "@/lib/routes/localized-path";
import { useUiLocale } from "@/i18n/use-ui-locale";

/**
 * Resolves the article the route names, then hands it to the editor.
 *
 * Reads the list the panel already loads rather than adding a second source of
 * truth for one entry: the tenant's entries are a single cached list and every
 * lifecycle call patches it in place.
 */
export function KompasArticleScreen({ entryId }: { entryId: string }) {
  const locale = useUiLocale();
  const entriesQuery = useContentEntriesQuery();
  const entry = (entriesQuery.data ?? []).find(
    (item) => item.entryId === entryId,
  );

  if (entriesQuery.isLoading) {
    return <p className="text-ink-55 text-[13.5px]">Učitavanje…</p>;
  }

  if (entriesQuery.isError) {
    return (
      <div className="border-danger/45 bg-danger/8 rounded-panel border px-5 py-4">
        <p className="text-coffee text-[14.5px] font-semibold">
          Tekst se ne može učitati
        </p>
        <p className="text-ink-70 mt-1 text-[13px] leading-[1.5]">
          {contentErrorMessage(
            entriesQuery.error,
            "Osvežite stranicu; ako se ponovi, javite tehničkom timu.",
          )}
        </p>
      </div>
    );
  }

  if (!entry || entry.contentType !== "article") {
    return (
      <div className="rounded-panel border-line bg-surface border px-5 py-6">
        <p className="text-forest font-serif text-[18px]">
          Ovaj tekst više ne postoji
        </p>
        <p className="text-ink-55 mt-2 text-[13px] leading-[1.55]">
          Možda je obrisan ili je otvoren pogrešan link.
        </p>
        <Link
          href={localizedPath("workspace.compass.home", {
            locale,
            tab: "content",
          })}
          className="text-forest mt-3 inline-flex min-h-11 items-center text-[13px] font-semibold underline"
        >
          ← Nazad na Kompas sadržaj
        </Link>
      </div>
    );
  }

  return <KompasArticleEditor key={entry.revisionId} entry={entry} />;
}
