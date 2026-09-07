import { PLATFORM_DEFAULT_LOCALE, type UiLocale } from "@/i18n/locales";
import { deploymentSlugFromEnv } from "@/lib/tenant/deployment-slug";
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
  /** Checked-in per-organization mapping; not a persisted organization field. */
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
  /**
   * First tenant in real daily use (D-080). `blank` rather than a copy of the
   * founding tenant's pack: she must start with her own empty, configurable
   * content, and `blank` reports every source as `missing` so an unauthored
   * surface is visible instead of silently showing someone else's copy.
   *
   * Serbian on both axes. The platform is multilingual-capable; a tenant owns
   * which locales actually carry authored content, and hers is `sr-Latn` until
   * she writes English herself.
   */
  "sanja-neuer": {
    contentPack: "blank",
    uiLocale: "sr-Latn",
    defaultContentLocale: "sr-Latn",
    timeZone: "Europe/Belgrade",
  },
};

/** Settings for `slug`, or `undefined` when the slug is not registered. */
export function findOrganizationLocaleSettings(
  slug: string,
): OrganizationLocaleSettings | undefined {
  return ORGANIZATION_LOCALE_SETTINGS[slug];
}

/**
 * A place the organization works from. Empty for an online-only tenant.
 *
 * `regionCode` is the short form ("IL") used where space is tight; `region` is
 * the full one ("Illinois") that structured data needs. Both are kept because
 * deriving one from the other is a lookup table nobody maintains.
 */
export interface OrganizationLocation {
  city: string;
  region: string;
  regionCode: string;
}

/**
 * Everything the public site says *about the organization itself* — the name in
 * the footer, the address people write to, where it works from.
 *
 * This replaces the module-level `content/site-settings.ts` constant, which
 * hardcoded one tenant's identity into every deployment: an organization with
 * `DEFAULT_ORGANIZATION_SLUG=sanja-neuer` still rendered "Psihointegritet" and
 * `info@psihointegritet.com` in its footer, contact page, legal documents and
 * JSON-LD. A constant cannot be wrong per deployment, which is exactly why it
 * was the wrong shape.
 *
 * Deliberately **not** page copy. Headlines, section text and SEO strings
 * belong to the content pack and later to the page model — this holds only the
 * facts that are true of the organization no matter which page is rendering.
 */
export interface OrganizationPublicSite {
  /** Name shown to visitors. Never a slug, never a legal suffix. */
  publicName: string;
  /**
   * Legal entity behind the tenant. Separate from `publicName` because legal
   * documents must name the entity that is actually liable, which is often not
   * the brand — and for Sanja is a different person entirely from the demo.
   */
  legalName: string;
  /** One line, used by `Organization` JSON-LD. Not a page description. */
  description: string;
  /** Address the public site invites people to write to. */
  contactEmail: string;
  /** Empty for an online-only tenant; drives `areaServed` and location labels. */
  locations: readonly OrganizationLocation[];
  /** `null` when `locations` is empty — an online-only tenant has no country. */
  country: string | null;
  /** How the tenant describes its formats, e.g. "online i uživo" / "online". */
  formatsLabel: string;
}

/**
 * Per-organization public identity, keyed by slug — same boundary and same
 * caveats as `ORGANIZATION_LOCALE_SETTINGS` above.
 *
 * Checked-in for the same reason: it is read during static generation of every
 * public page, so it must be knowable without a request.
 *
 * This is the whole source today, not a cache in front of one. The backend
 * `organizations` table carries `display_name` and the two locales and nothing
 * else here — persisted, editable public-site configuration does not exist yet,
 * and PDC-0B deliberately did not add it. Under C2(a) a deployment may own its
 * public identity as build-time configuration, so nothing is missing until a
 * tenant needs to edit these values from their own admin.
 *
 * Under B2 (D-077 A7) this table stops being keyed by *this deployment* and
 * starts being keyed by *the resolved tenant* — the same shape, a different
 * selector. That is why the registry survives the migration unchanged while the
 * lookup around it moves.
 *
 * When that lands, `getDeploymentOrganization()` is where a live value overrides
 * this one, exactly as it already does for locales. Whether it arrives as
 * columns on `organizations` or a separate settings table is decided then,
 * alongside the screen that writes it — not pre-emptively here.
 */
export const ORGANIZATION_PUBLIC_SITE: Record<string, OrganizationPublicSite> =
  {
    psihointegritet: {
      publicName: "Psihointegritet",
      legalName: "Psihointegritet",
      description: "Digitalni centar za mentalno zdravlje",
      contactEmail: "info@psihointegritet.com",
      // D-076: Chicago (IL), Milwaukee (WI), Madison (WI). These must stay in
      // step with `city` in the locale therapist catalogues — the booking
      // location picker and the guided-selection in-person filter compare a
      // visitor's answer against the therapist's city, so a value that appears
      // here but nowhere in the team silently returns no therapists.
      locations: [
        { city: "Chicago", region: "Illinois", regionCode: "IL" },
        { city: "Milwaukee", region: "Wisconsin", regionCode: "WI" },
        { city: "Madison", region: "Wisconsin", regionCode: "WI" },
      ],
      country: "USA",
      formatsLabel: "online i uživo",
    },
    "psihointegritet-en": {
      publicName: "Psihointegritet",
      legalName: "Psihointegritet",
      description: "Digital center for mental health",
      contactEmail: "info@psihointegritet.com",
      locations: [
        { city: "Chicago", region: "Illinois", regionCode: "IL" },
        { city: "Milwaukee", region: "Wisconsin", regionCode: "WI" },
        { city: "Madison", region: "Wisconsin", regionCode: "WI" },
      ],
      country: "USA",
      formatsLabel: "online and in person",
    },
    /**
     * First tenant in real daily use (D-080). Online only, so `locations` is
     * empty and `country` is `null` — the surfaces that render locations must
     * therefore tolerate having none, which is the property that proves this
     * registry is tenant-scoped rather than Psihointegritet with new strings.
     *
     * `contactEmail` is **NEEDS CLIENT INPUT** (tenant spec §9.1) and holds a
     * placeholder on her domain until she confirms one. It is not published
     * anywhere yet: her deployment does not exist until PDC-0A.
     */
    "sanja-neuer": {
      publicName: "Sanja Neuer",
      legalName: "Sanja Neuer",
      description:
        "Konsultacije i mentorstvo — psihoterapija, porodične konstelacije i neuroplastično kreiranje budućnosti",
      contactEmail: "kontakt@sanjaneuer.com",
      locations: [],
      country: null,
      formatsLabel: "online",
    },
  };

/** Public identity for `slug`, or `undefined` when the slug is not registered. */
export function findOrganizationPublicSite(
  slug: string,
): OrganizationPublicSite | undefined {
  return ORGANIZATION_PUBLIC_SITE[slug];
}

/**
 * This deployment's public identity, resolved synchronously.
 *
 * Lives here rather than in `lib/tenant/public-site.ts` because that module is
 * `server-only`, and two callers cannot be: `content-governance/static-provider.ts`
 * builds its route catalogue as a module-level constant, and the Content Health
 * CLI imports the same module under plain Node. Both need the answer without a
 * request and without a server context.
 *
 * Mirrors `deploymentContentPack()` in `content/registry.ts` — same env, same
 * C2(a) reasoning, same throw-on-unknown posture as `resolveDeploymentOrganization`.
 */
export function deploymentPublicSite(): OrganizationPublicSite {
  const slug = deploymentSlugFromEnv();
  const publicSite = findOrganizationPublicSite(slug);
  if (publicSite === undefined) {
    throw new Error(
      `Unknown organization slug "${slug}" has no public site configuration. ` +
        `Register it in src/lib/tenant/organizations.ts or fix ` +
        `DEFAULT_ORGANIZATION_SLUG for this deployment.`,
    );
  }
  return publicSite;
}

/**
 * „Chicago, IL · Milwaukee, WI · Madison, WI" — for tight surfaces.
 *
 * Empty string when the tenant has no locations. Callers must treat that as
 * "say nothing" rather than rendering an empty separator: an online-only tenant
 * has no places to list, and a dangling „ · " is how that leaks into the page.
 */
export function organizationLocationsLabel(
  settings: OrganizationPublicSite,
): string {
  return settings.locations
    .map((location) => `${location.city}, ${location.regionCode}`)
    .join(" · ");
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
