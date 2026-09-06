import "server-only";

import { resolvePublicLocale } from "@/lib/tenant/public-locale";
import { serverEnv } from "@/lib/validation/env";

import {
  CmsContentProvider,
  parsePublishedContentOverrides,
} from "./cms-provider";
import { publicContentCacheTag } from "./cache";
import {
  staticContentProvider,
  staticContentProviderForLocale,
} from "./static-provider";
import type { ContentProvider } from "./types";

/**
 * Public resolver boundary (CG-D1). Backend unavailability must never remove
 * the checked-in fallback copy, so every fetch/shape failure resolves to the
 * static provider.
 */
export async function getContentProvider(): Promise<ContentProvider> {
  let fallback = staticContentProvider;
  try {
    const locale = await resolvePublicLocale();
    fallback = staticContentProviderForLocale(locale);
    const response = await fetch(
      `${serverEnv.NEXT_PUBLIC_API_URL}/api/v1/public/content/published?locale=${encodeURIComponent(locale)}`,
      {
        next: {
          revalidate: 300,
          tags: [publicContentCacheTag(locale)],
        },
      },
    );
    if (!response.ok) return fallback;
    const revisions = parsePublishedContentOverrides(await response.json());
    if (!revisions || revisions.length === 0) {
      return fallback;
    }
    return new CmsContentProvider(fallback, revisions);
  } catch {
    return fallback;
  }
}
