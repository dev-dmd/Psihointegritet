"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  contentErrorMessage,
  useContentEntriesQuery,
} from "../../hooks/use-content-entries";
import { useCreateArticleMutation } from "../../hooks/use-compass-content";
import { PageHeader } from "../page-header";
import { KompasContentCreate } from "./kompas-content-create";
import { localizedPath } from "@/lib/routes/localized-path";
import { useUiLocale } from "@/i18n/use-ui-locale";

/**
 * „Novi sadržaj" as its own page (D-063).
 *
 * The author arrives here to publish a text, so the first question is what
 * they want to publish — not which registry entry to create. The area and the
 * topic are asked for inside the article's own flow (§5H-2), after the text
 * exists and can no longer be lost.
 */
export function KompasContentNew() {
  const router = useRouter();
  const locale = useUiLocale();
  const entriesQuery = useContentEntriesQuery();
  const createArticle = useCreateArticleMutation();

  const takenSlugs = (entriesQuery.data ?? [])
    .filter((entry) => entry.contentType === "article")
    .map((entry) => entry.slug);

  return (
    <section className="animate-fade-up">
      <PageHeader
        title="Novi Kompas sadržaj"
        description="Tekst se čuva kao radna verzija čim ga napravite, pa ne možete izgubiti rad ni ako još niste izabrali oblast."
      />

      <Link
        href={localizedPath("workspace.compass.home", {
          locale,
          tab: "content",
        })}
        className="text-forest mb-4 inline-flex min-h-11 items-center text-[13px] font-semibold underline"
      >
        ← Nazad na Kompas sadržaj
      </Link>

      <KompasContentCreate
        isPending={createArticle.isPending}
        takenSlugs={takenSlugs}
        serverError={
          createArticle.isError
            ? contentErrorMessage(
                createArticle.error,
                "Tekst nije napravljen. Pokušajte ponovo.",
              )
            : null
        }
        onCreate={(slug) =>
          createArticle.mutate(
            { slug },
            {
              onSuccess: (entry) =>
                router.push(
                  localizedPath("workspace.compass.content.detail", {
                    locale,
                    params: { entryId: entry.entryId },
                  }),
                ),
            },
          )
        }
      />
    </section>
  );
}
