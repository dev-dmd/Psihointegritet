import "server-only";

import { auth } from "@clerk/nextjs/server";

import type { ApiContentRevision } from "@/features/workspace/content-api";
import { serverEnv } from "@/lib/validation/env";

/**
 * Fetch one exact revision through the authenticated backend boundary.
 * Drafts never enter the public `/published` read-model or its cache.
 */
export async function getStaffContentPreview(
  entryId: string,
  revisionId: string,
): Promise<ApiContentRevision | null> {
  const session = await auth();
  const token = await session.getToken();
  if (!token) {
    throw new Error("Prijava je obavezna za pregled nacrta.");
  }

  const response = await fetch(
    `${serverEnv.NEXT_PUBLIC_API_URL}/api/v1/content/entries/${encodeURIComponent(entryId)}/revisions/${encodeURIComponent(revisionId)}/preview`,
    {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    },
  );
  if (response.status === 404) return null;
  if (!response.ok) {
    throw new Error(`Pregled nacrta nije dostupan (${response.status}).`);
  }
  return (await response.json()) as ApiContentRevision;
}
