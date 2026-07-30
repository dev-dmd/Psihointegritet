import "server-only";

import { serverEnv } from "@/lib/validation/env";

import {
  CmsContentProvider,
  type PublishedContentOverride,
} from "./cms-provider";
import { staticContentProvider } from "./static-provider";
import type { ContentProvider } from "./types";

/**
 * Public resolver boundary (CG-D1). Backend unavailability must never remove
 * the checked-in fallback copy, so every fetch/shape failure resolves to the
 * static provider.
 */
export async function getContentProvider(): Promise<ContentProvider> {
  try {
    const response = await fetch(
      `${serverEnv.NEXT_PUBLIC_API_URL}/api/v1/public/content/published?locale=sr-Latn`,
      { cache: "no-store" },
    );
    if (!response.ok) return staticContentProvider;
    const revisions = (await response.json()) as PublishedContentOverride[];
    if (!Array.isArray(revisions) || revisions.length === 0) {
      return staticContentProvider;
    }
    return new CmsContentProvider(staticContentProvider, revisions);
  } catch {
    return staticContentProvider;
  }
}
