import {
  PLATFORM_DEFAULT_LOCALE,
  type UiLocale,
  isUiLocale,
} from "@/i18n/locales";
import { findOrganizationLocaleSettings } from "@/lib/tenant/organizations";

/**
 * Which locale the **content fallback layer** is written in.
 *
 * # Why this is a module-level constant and not a function of the request
 *
 * `src/content/*` is the D-038 fallback: the CMS overrides it field by field,
 * and what is left showing is what the tenant has not written yet. It is read
 * by 51 modules, most of them Server Components that prerender — so making it
 * request-dependent would either thread a locale through every one of them or
 * quietly drag the public site into per-request rendering.
 *
 * Under C2(a) it does not need to. One deployment serves one organization,
 * which has exactly one `default_content_locale`, so the choice is known at
 * build time. This reads the same `DEFAULT_ORGANIZATION_SLUG` the rest of the
 * tenant seam reads, and nothing else.
 *
 * If host-shared multi-tenancy ever lands, this is one of the modules that has
 * to change — and the fact that it is a single named function, rather than 51
 * import sites, is the point of it existing.
 *
 * # Why the fallback is translated at all
 *
 * Tenant-authored content is never translated by the platform (D-077). But the
 * fallback is not tenant-authored — it is ours, and it does two jobs an empty
 * string cannot:
 *
 * 1. it shows an administrator what a field is *for*, in their own language;
 * 2. it demonstrates a realistic **length**, which matters because the CMS caps
 *    characters per system field so the design does not break. A placeholder
 *    that is half the length of the real thing teaches the wrong limit.
 *
 * The moment a tenant writes their own text, this disappears behind it.
 */
export function deploymentContentLocale(): UiLocale {
  // `process.env` rather than `serverEnv`: this module is imported by content
  // files that Client Components also read, so it must not pull in
  // `server-only`. The value is validated by the zod schema at startup either
  // way, and an unknown slug degrades here rather than crashing every render —
  // `org-context.ts` is the one that throws.
  const slug = process.env.DEFAULT_ORGANIZATION_SLUG ?? "psihointegritet";
  const settings = findOrganizationLocaleSettings(slug);
  const locale = settings?.defaultContentLocale ?? PLATFORM_DEFAULT_LOCALE;
  return isUiLocale(locale) ? locale : PLATFORM_DEFAULT_LOCALE;
}

/**
 * Picks the fallback written in the deployment's content locale.
 *
 * Content modules keep their public import path (`@/content/therapists`), so
 * none of the 51 readers change. Only the module's own body does.
 */
export function pickContent<T>(byLocale: Record<UiLocale, T>): T {
  return byLocale[deploymentContentLocale()];
}
