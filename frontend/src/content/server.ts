import "server-only";

import { resolvePublicLocale } from "@/lib/tenant/public-locale";

import { getFallbackContentForLocale, type FallbackContent } from "./registry";

/** SSG/ISR-safe fallback selected from the organization's cached `ui_locale`. */
export async function getFallbackContent(): Promise<FallbackContent> {
  return getFallbackContentForLocale(await resolvePublicLocale());
}
