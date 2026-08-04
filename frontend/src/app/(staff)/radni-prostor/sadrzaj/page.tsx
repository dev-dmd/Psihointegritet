import type { Metadata } from "next";

import { ScreenSadrzaj } from "@/features/workspace/components/screen-sadrzaj";
import { requireOrgAdmin } from "@/lib/auth/guards";

export const metadata: Metadata = { title: "Sadržaj" };

/**
 * `entryId` lets another screen hand this one a specific entry to open — the
 * Kompas content workspace links here rather than reimplementing the editor.
 * Read on the server like the booking page does, so no client-side
 * `useSearchParams` and no Suspense boundary are needed.
 */
export default async function WorkspaceContentPage({
  searchParams,
}: {
  searchParams: Promise<{ entryId?: string; izvor?: string }>;
}) {
  await requireOrgAdmin();
  const params = await searchParams;
  return (
    <ScreenSadrzaj
      initialEntryId={params.entryId ?? null}
      returnToKompas={params.izvor === "kompas"}
    />
  );
}
