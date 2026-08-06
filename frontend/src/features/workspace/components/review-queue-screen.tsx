"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";

import { PageHeader } from "../components/page-header";

interface ApiReviewQueueItem {
  entryId: string;
  revisionId: string;
  contentType: string;
  slug: string;
  versionLabel: string;
  submittedAt: string;
  submittedByDisplayName: string | null;
  capability: "clinical" | "business" | "legal";
  alreadyDecided: boolean;
  decidedOutcome: "approved" | "rejected" | null;
}

const CAPABILITY_LABELS: Record<string, string> = {
  clinical: "Stručni pregled",
  business: "Poslovni pregled",
  legal: "Pravni pregled",
};

async function fetchReviewQueue(): Promise<ApiReviewQueueItem[]> {
  const response = await fetch("/api/content/review-queue", {
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error("Greška pri učitavanju pregleda.");
  }
  return response.json();
}

export function ReviewQueueScreen() {
  const queue = useQuery({
    queryKey: ["review-queue"],
    queryFn: fetchReviewQueue,
    refetchInterval: 30_000,
  });

  if (queue.isLoading) {
    return <p className="text-ink-55 text-[13.5px]">Učitavanje pregleda…</p>;
  }

  if (queue.isError) {
    return (
      <div className="border-danger/45 bg-danger/8 rounded-panel border px-5 py-4">
        <p className="text-coffee text-[14.5px] font-semibold">
          Pregledi se ne mogu učitati
        </p>
        <p className="text-ink-70 mt-1 text-[13px] leading-[1.5]">
          {queue.error instanceof Error
            ? queue.error.message
            : "Osvežite stranicu; ako se ponovi, javite tehničkom timu."}
        </p>
      </div>
    );
  }

  const items = queue.data ?? [];

  if (items.length === 0) {
    return (
      <>
        <PageHeader
          title="Pregledi"
          description="Tekstovi koji čekaju vaš stručni pregled."
        />
        <div className="rounded-panel border-line bg-surface border px-6 py-8 text-center">
          <p className="text-forest font-serif text-[18px]">
            Nema tekstova za pregled
          </p>
          <p className="text-ink-55 mt-2 text-[13px]">
            Svi tekstovi su pregledani ili još nijedan nije poslat na stručni
            pregled.
          </p>
        </div>
      </>
    );
  }

  // Group by entry (one entry may appear multiple times per capability)
  const grouped = new Map<string, ApiReviewQueueItem[]>();
  for (const item of items) {
    const key = item.entryId;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(item);
  }

  return (
    <section className="animate-fade-up">
      <PageHeader
        title="Pregledi"
        description="Tekstovi koji čekaju vaš stručni pregled. Prikazani su samo zadaci za capability-je koje ste ovlašćeni da pregledate."
      />

      <div className="mt-6 space-y-4">
        {[...grouped.entries()].map(([entryId, entries]) => {
          const first = entries[0];
          if (!first) return null;
          const pending = entries.filter((e) => !e.alreadyDecided);
          const decided = entries.filter(
            (e) => e.alreadyDecided && e.decidedOutcome === "approved",
          );
          const allApproved = pending.length === 0 && decided.length > 0;

          return (
            <a
              key={entryId}
              href={`/radni-prostor/kompas/${entryId}`}
              className="rounded-panel border-line bg-surface hover:shadow-card-hover block border px-6 py-5 transition-shadow"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-forest font-serif text-[16px]">
                    {first.slug}
                  </h3>
                  <p className="text-ink-55 mt-0.5 text-[12px]">
                    {first.versionLabel} · Poslao{" "}
                    {first.submittedByDisplayName ?? "—"} ·{" "}
                    {new Date(first.submittedAt).toLocaleDateString("sr-Latn")}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {entries.map((entry) => (
                      <span
                        key={entry.capability}
                        className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${
                          entry.alreadyDecided
                            ? entry.decidedOutcome === "approved"
                              ? "bg-badge-ok-bg text-badge-ok"
                              : "bg-badge-danger-bg text-badge-danger"
                            : "bg-badge-wait-bg text-badge-wait"
                        }`}
                      >
                        {CAPABILITY_LABELS[entry.capability] ?? entry.capability}
                        {entry.alreadyDecided
                          ? entry.decidedOutcome === "approved"
                            ? " — odobreno"
                            : " — vraćeno"
                          : " — čeka se"}
                      </span>
                    ))}
                  </div>
                </div>
                {allApproved ? (
                  <span className="bg-badge-ok-bg text-badge-ok shrink-0 rounded-full px-2.5 py-0.5 text-[11px]">
                    Spremno
                  </span>
                ) : (
                  <span className="text-ink-45 shrink-0 text-[11px]">
                    {pending.length} čeka
                  </span>
                )}
              </div>
            </a>
          );
        })}
      </div>
    </section>
  );
}
