import { PLATFORM_DEFAULT_LOCALE, type UiLocale } from "@/i18n/locales";
import type { ContentPackId } from "@/content/pack-types";

/**
 * Per-organization locale settings, keyed by organization slug.
 *
 * This is the same class of thing as `DEFAULT_ORG` in
 * `lib/auth/clerk/public-metadata.ts` — an interim, checked-in source that the
 * backend replaces later. It is not a second tenancy model: `organization_id`
 * remains the only isolation boundary (D-055, ADR-023), and nothing here
 * grants access to anything.
 *
 * Why a static registry rather than a fetch: `i18n/request.ts` runs for every
 * request that renders a translated component, including the root layout. A
 * network call (or anything reading `cookies()`/`headers()`) there would make
 * the root layout dynamic and strip static rendering from every public
 * marketing page. Reading a build-time constant keeps them static.
 *
 * No `server-only`: the proxy runs on the edge and needs the same table to
 * decide a locale redirect before any Server Component renders.
 *
 * TODO(org-backend): when `GET /api/v1/organizations/me` lands (I18N-7),
 * replace this table with a build-time fetch or a generated constant. Callers
 * go through `getRequestOrganization()` and keep working unchanged — the same
 * seam shape `lib/auth/identity-server.ts` already uses for identity.
 */

export interface OrganizationLocaleSettings {
  /** Checked-in C2(a) deployment mapping; not a persisted organization field. */
  contentPack: ContentPackId;
  /** Language of navigation, system messages, statuses and system emails. */
  uiLocale: UiLocale;
  /**
   * Locale stamped on newly created tenant-authored content. Separate from
   * `uiLocale` on purpose: switching the panel to English must never change
   * the language of articles the tenant already wrote, and D-077 keeps the two
   * independent even though today's UI ties them together by default.
   */
  defaultContentLocale: UiLocale;
  /**
   * IANA zone. Carried next to the locale, never derived from it — `en` does
   * not mean America any more than `sr-Latn` means Belgrade. Passed explicitly
   * to `next-intl` so server (UTC container) and browser format the same
   * instant identically; without it, dates render differently across midnight.
   */
  timeZone: string;
}

export const ORGANIZATION_LOCALE_SETTINGS: Record<
  string,
  OrganizationLocaleSettings
> = {
  // The founding tenant. Backfilled to `sr-Latn` by migration
  // `20260811_0026_organization_locales`, not defaulted — D-077 makes `en` the
  // platform default, and this organization must never inherit it.
  psihointegritet: {
    contentPack: "psihointegritet",
    uiLocale: "sr-Latn",
    defaultContentLocale: "sr-Latn",
    timeZone: "Europe/Belgrade",
  },
  /**
   * Not a customer — the English reference deployment.
   *
   * It exists so `content:check` and the e2e suite can run the platform in its
   * default locale without waiting for a real English tenant. Without it the
   * English fallback would ship unverified: nothing would hold it to the
   * character limits, and English is routinely longer than Serbian.
   */
  "psihointegritet-en": {
    contentPack: "psihointegritet",
    uiLocale: "en",
    defaultContentLocale: "en",
    timeZone: "America/Chicago",
  },
};

/** Settings for `slug`, or `undefined` when the slug is not registered. */
export function findOrganizationLocaleSettings(
  slug: string,
): OrganizationLocaleSettings | undefined {
  return ORGANIZATION_LOCALE_SETTINGS[slug];
}

/**
 * What an organization gets when it has no entry yet.
 *
 * Used only where falling back is provably safe (see `org-context.ts`, which
 * throws instead). Kept here so the platform default lives in one place.
 */
export const FALLBACK_ORGANIZATION_LOCALE_SETTINGS: OrganizationLocaleSettings =
  {
    contentPack: "mental-health-starter",
    uiLocale: PLATFORM_DEFAULT_LOCALE,
    defaultContentLocale: PLATFORM_DEFAULT_LOCALE,
    timeZone: "UTC",
  };
