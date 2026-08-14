import type { UiLocale } from "@/i18n/locales";

/**
 * The locale-neutral route registry (D-077 Amendment, ROUTE-I18N-1).
 *
 * # The contract
 *
 * A **route id is the only stable identity of a screen.** English and Serbian
 * pathnames are presentation values that hang off it, exactly like a label
 * hangs off a message key. Nothing in the codebase may name a platform path as
 * a string literal again: navigation, links, redirects, active state, analytics
 * and the proxy all speak route ids.
 *
 * Locked rules this file encodes:
 *
 * - **Query parameters are never translated.** `?tab=` values are stable codes
 *   shared by both languages, so `/workspace/schedule?tab=working-hours` and
 *   `/radni-prostor/raspored?tab=working-hours` are the same screen state.
 *   Slugs, UUIDs and internal codes are likewise never translated.
 * - **API routes are never localized** and are absent from this registry.
 * - **Superadmin routes are never localized** — it is a platform surface, not a
 *   tenant one, so both locales resolve to the same English path. They are
 *   registered anyway, because that is what lets the fourth copy of `isActive`
 *   be deleted.
 * - **One Next.js page serves both localized paths.** `internal` is the single
 *   physical route; the proxy rewrites the non-canonical external path onto it
 *   (ROUTE-I18N-4). There is never a second page, component or loader per
 *   language.
 * - **A planned route is not created until its screen exists.** Planned ids
 *   live in `PLANNED_ROUTES` below — an inventory with no `internal` path, so
 *   `localizedPath` cannot be called with one and cannot mint a link to a 404.
 * - **Registered public routes are locale-aware.** Public links render the
 *   locale's external path and the proxy rewrites both spellings onto the
 *   existing Serbian physical page. Dynamic content slugs and query values
 *   remain stable. Canonical/hreflang/sitemap policy remains a separate SEO
 *   concern; route activation does not invent translated CMS slugs.
 *
 * # Zero behaviour change
 *
 * # Where the two path columns meet the filesystem
 *
 * `internal` is the physical Next.js route and always equals `paths.en` — the
 * English segments are the canonical ones on disk. A Serbian organization never
 * sees them: `proxy.ts` rewrites `/radni-prostor/podesavanja` onto
 * `/workspace/settings` while the browser keeps the Serbian URL, and a request
 * whose path locale disagrees with the organization's gets a 308 to the
 * equivalent path.
 *
 * Live Serbian URLs are therefore unchanged by the move — they are still what
 * `localizedPath(..., "sr-Latn")` produces and still what the address bar shows.
 * The single deliberate exception is `workspace.schedule`, whose Serbian path
 * becomes `/raspored`; the old `/dostupnost` is kept in `ROUTE_ALIASES`.
 */

/** Query keys whose values are stable codes, never translated. */
export type TabCode = string;

export interface RouteDefinition {
  /**
   * The physical Next.js route. Asserted against the filesystem by
   * `platform-routes.test.ts` — `typedRoutes` cannot express dynamic templates,
   * so a bijection test replaces the compile check for those.
   */
  internal: string;
  /** External path per locale. `paths.en === internal` after ROUTE-I18N-3. */
  paths: Record<UiLocale, string>;
  /** Ordered dynamic segment names, matching the `[brackets]` in `internal`. */
  params?: readonly string[];
  /** Allowed `?tab=` values. Locale-neutral codes — never translated. */
  tabs?: readonly TabCode[];
  /**
   * How `isRouteActive` matches. `"exact"` for section roots, which would
   * otherwise stay lit for every child route. Defaults to `"prefix"`.
   */
  match?: "exact" | "prefix";
  /** Requires an authenticated session; feeds `PROTECTED_ROUTE_PREFIXES`. */
  protected?: true;
  /** Same path in every locale — platform surface, not a tenant one. */
  localeNeutral?: true;
}

/**
 * Tab values are stable, locale-neutral codes. The Serbian ones these replaced
 * (`radno-vreme|slotovi|izuzeci`, `javni|match|dostupnost`) were the only
 * translated query parameters in the system; the screens accept them as
 * aliases for one release so existing links keep landing correctly.
 */
const SCHEDULE_TABS = ["working-hours", "slots", "exceptions"] as const;
const PROFILE_TABS = ["public", "matching", "availability"] as const;
const COMPASS_TABS = [
  "overview",
  "content",
  "registry",
  "flow",
  "results",
  "testing",
  "publishing",
] as const;

export const PLATFORM_ROUTES = {
  // ── Staff workspace ─────────────────────────────────────────────────────
  "workspace.home": {
    internal: "/workspace",
    paths: { en: "/workspace", "sr-Latn": "/radni-prostor" },
    match: "exact",
    protected: true,
  },
  "workspace.appointments.list": {
    internal: "/workspace/appointments",
    paths: {
      en: "/workspace/appointments",
      "sr-Latn": "/radni-prostor/termini",
    },
    protected: true,
  },
  "workspace.schedule": {
    // The physical directory is `schedule`; the Serbian canonical is
    // `/raspored`. `/radni-prostor/dostupnost` survives as a 308 alias in
    // `ROUTE_ALIASES` so existing bookmarks and links keep working.
    internal: "/workspace/schedule",
    paths: { en: "/workspace/schedule", "sr-Latn": "/radni-prostor/raspored" },
    tabs: SCHEDULE_TABS,
    protected: true,
  },
  "workspace.clients.list": {
    internal: "/workspace/clients",
    paths: { en: "/workspace/clients", "sr-Latn": "/radni-prostor/klijenti" },
    protected: true,
  },
  "workspace.companies.list": {
    internal: "/workspace/companies",
    paths: {
      en: "/workspace/companies",
      "sr-Latn": "/radni-prostor/kompanije",
    },
    protected: true,
  },
  "workspace.services.list": {
    internal: "/workspace/services",
    paths: { en: "/workspace/services", "sr-Latn": "/radni-prostor/usluge" },
    protected: true,
  },
  "workspace.research": {
    internal: "/workspace/research",
    paths: {
      en: "/workspace/research",
      "sr-Latn": "/radni-prostor/istrazivanja",
    },
    protected: true,
  },
  "workspace.documents": {
    internal: "/workspace/documents",
    paths: {
      en: "/workspace/documents",
      "sr-Latn": "/radni-prostor/dokumenti",
    },
    protected: true,
  },
  "workspace.content.list": {
    internal: "/workspace/content",
    paths: { en: "/workspace/content", "sr-Latn": "/radni-prostor/sadrzaj" },
    protected: true,
  },
  "workspace.content.review": {
    internal: "/workspace/content/[entryId]/revisions/[revisionId]/review",
    paths: {
      en: "/workspace/content/[entryId]/revisions/[revisionId]/review",
      "sr-Latn":
        "/radni-prostor/sadrzaj/[entryId]/revizije/[revisionId]/pregled",
    },
    params: ["entryId", "revisionId"],
    protected: true,
  },
  "workspace.compass.home": {
    internal: "/workspace/compass",
    paths: { en: "/workspace/compass", "sr-Latn": "/radni-prostor/kompas" },
    tabs: COMPASS_TABS,
    protected: true,
  },
  "workspace.compass.content.list": {
    internal: "/workspace/compass/content",
    paths: {
      en: "/workspace/compass/content",
      "sr-Latn": "/radni-prostor/kompas/sadrzaj",
    },
    protected: true,
  },
  "workspace.compass.content.new": {
    internal: "/workspace/compass/content/new",
    paths: {
      en: "/workspace/compass/content/new",
      "sr-Latn": "/radni-prostor/kompas/sadrzaj/novo",
    },
    protected: true,
  },
  "workspace.compass.content.detail": {
    internal: "/workspace/compass/content/[entryId]",
    paths: {
      en: "/workspace/compass/content/[entryId]",
      "sr-Latn": "/radni-prostor/kompas/sadrzaj/[entryId]",
    },
    params: ["entryId"],
    protected: true,
  },
  "workspace.therapists.list": {
    internal: "/workspace/therapists",
    paths: {
      en: "/workspace/therapists",
      "sr-Latn": "/radni-prostor/terapeuti",
    },
    protected: true,
  },
  "workspace.profile": {
    internal: "/workspace/profile",
    paths: { en: "/workspace/profile", "sr-Latn": "/radni-prostor/profil" },
    tabs: PROFILE_TABS,
    protected: true,
  },
  "workspace.settings.home": {
    internal: "/workspace/settings",
    paths: {
      en: "/workspace/settings",
      "sr-Latn": "/radni-prostor/podesavanja",
    },
    protected: true,
  },

  // ── Client account panel ────────────────────────────────────────────────
  "account.home": {
    internal: "/account",
    paths: { en: "/account", "sr-Latn": "/nalog" },
    match: "exact",
    protected: true,
  },
  "account.appointments": {
    internal: "/account/appointments",
    paths: { en: "/account/appointments", "sr-Latn": "/nalog/termini" },
    protected: true,
  },
  "account.programs": {
    internal: "/account/programs",
    paths: { en: "/account/programs", "sr-Latn": "/nalog/programi" },
    protected: true,
  },
  "account.profile": {
    internal: "/account/profile",
    paths: { en: "/account/profile", "sr-Latn": "/nalog/profil" },
    protected: true,
  },
  /**
   * Kept registered although the client panel's fourth tab is `account.profile`
   * (design handoff „KP 04 Profil", which merges profile, notification
   * preferences and consents into one screen). The page survives as a redirect
   * so links minted before the panel existed keep landing somewhere real.
   */
  "account.settings": {
    internal: "/account/settings",
    paths: { en: "/account/settings", "sr-Latn": "/nalog/podesavanja" },
    protected: true,
  },

  // ── Superadmin — platform surface, identical in every locale ────────────
  "superadmin.home": {
    internal: "/superadmin",
    paths: { en: "/superadmin", "sr-Latn": "/superadmin" },
    match: "exact",
    protected: true,
    localeNeutral: true,
  },
  "superadmin.tenants.list": {
    internal: "/superadmin/tenants",
    paths: { en: "/superadmin/tenants", "sr-Latn": "/superadmin/tenants" },
    protected: true,
    localeNeutral: true,
  },
  "superadmin.tenants.detail": {
    internal: "/superadmin/tenants/[tenantId]",
    paths: {
      en: "/superadmin/tenants/[tenantId]",
      "sr-Latn": "/superadmin/tenants/[tenantId]",
    },
    params: ["tenantId"],
    protected: true,
    localeNeutral: true,
  },
  "superadmin.diagnostics": {
    internal: "/superadmin/diagnostics",
    paths: {
      en: "/superadmin/diagnostics",
      "sr-Latn": "/superadmin/diagnostics",
    },
    protected: true,
    localeNeutral: true,
  },
  "superadmin.auditLog": {
    internal: "/superadmin/audit-log",
    paths: { en: "/superadmin/audit-log", "sr-Latn": "/superadmin/audit-log" },
    protected: true,
    localeNeutral: true,
  },
  "superadmin.billing": {
    internal: "/superadmin/billing",
    paths: { en: "/superadmin/billing", "sr-Latn": "/superadmin/billing" },
    protected: true,
    localeNeutral: true,
  },
  "superadmin.features": {
    internal: "/superadmin/features",
    paths: { en: "/superadmin/features", "sr-Latn": "/superadmin/features" },
    protected: true,
    localeNeutral: true,
  },
  "superadmin.settings": {
    internal: "/superadmin/settings",
    paths: { en: "/superadmin/settings", "sr-Latn": "/superadmin/settings" },
    protected: true,
    localeNeutral: true,
  },
} as const satisfies Record<string, RouteDefinition>;

export type PlatformRouteId = keyof typeof PLATFORM_ROUTES;

/**
 * Routes the agreed UX architecture needs but whose screen does not exist yet.
 *
 * Inventory only, deliberately without `internal`: a planned id cannot be
 * passed to `localizedPath`, so no link to a 404 can be minted from it. Move an
 * entry into `PLATFORM_ROUTES` in the same change that adds its page.
 *
 * Kept in code rather than only in the plan document so the naming decision is
 * reviewed next to the routes it must stay consistent with — a Serbian segment
 * invented ad hoc six weeks from now is how `/usmeravanje` becomes
 * `/intake-matching` in one place and `/usmjeravanje` in another.
 */
export const PLANNED_ROUTES = {
  "account.appointmentDetail": {
    en: "/account/appointments/[appointmentId]",
    "sr-Latn": "/nalog/termini/[appointmentId]",
  },
  "account.documents": {
    en: "/account/documents",
    "sr-Latn": "/nalog/dokumenti",
  },
  "account.notifications": {
    en: "/account/notifications",
    "sr-Latn": "/nalog/obavestenja",
  },
  "workspace.appointments.new": {
    en: "/workspace/appointments/new",
    "sr-Latn": "/radni-prostor/termini/novi",
  },
  "workspace.appointments.detail": {
    en: "/workspace/appointments/[appointmentId]",
    "sr-Latn": "/radni-prostor/termini/[appointmentId]",
  },
  "workspace.services.new": {
    en: "/workspace/services/new",
    "sr-Latn": "/radni-prostor/usluge/nova",
  },
  "workspace.services.detail": {
    en: "/workspace/services/[serviceId]",
    "sr-Latn": "/radni-prostor/usluge/[serviceId]",
  },
  "workspace.clients.detail": {
    en: "/workspace/clients/[clientId]",
    "sr-Latn": "/radni-prostor/klijenti/[clientId]",
  },
  "workspace.companies.detail": {
    en: "/workspace/companies/[companyId]",
    "sr-Latn": "/radni-prostor/kompanije/[companyId]",
  },
  "workspace.therapists.detail": {
    en: "/workspace/therapists/[therapistId]",
    "sr-Latn": "/radni-prostor/terapeuti/[therapistId]",
  },
  "workspace.content.detail": {
    en: "/workspace/content/[entryId]",
    "sr-Latn": "/radni-prostor/sadrzaj/[entryId]",
  },
  // Serbian segment is `/usmeravanje` rather than a transliterated
  // `intake-matching`: the workspace URL is staff-visible, and a Serbian
  // organization should not read an English product term in its own address bar.
  "workspace.intakeMatching.home": {
    en: "/workspace/intake-matching",
    "sr-Latn": "/radni-prostor/usmeravanje",
  },
  "workspace.intakeMatching.teamQueue": {
    en: "/workspace/intake-matching/team-queue",
    "sr-Latn": "/radni-prostor/usmeravanje/red-tima",
  },
  "workspace.settings.language": {
    en: "/workspace/settings/language",
    "sr-Latn": "/radni-prostor/podesavanja/jezik",
  },
} as const satisfies Record<string, Record<UiLocale, string>>;

export type PlannedRouteId = keyof typeof PLANNED_ROUTES;

/**
 * Public marketing routes — **recorded, not activated**.
 *
 * Serbian paths are the live canonical URLs and must not change here. The
 * English column is the agreed target for the separate public SEO slice, which
 * additionally owns the route inventory, redirect matrix, canonical check,
 * sitemap migration and SEO acceptance test. Nothing reads this constant yet;
 * it exists so the naming is decided once, in the open, before any of that.
 *
 * `/[documentSlug]` is deliberately absent: it is a CMS-authored slug belonging
 * to the organization's content locale, not a platform route segment.
 */
export const PUBLIC_ROUTES = {
  "public.home": { en: "/", "sr-Latn": "/" },
  "public.about": { en: "/about", "sr-Latn": "/o-nama" },
  "public.findSupport": { en: "/find-support", "sr-Latn": "/pronadji-podrsku" },
  "public.services.list": { en: "/services", "sr-Latn": "/usluge" },
  "public.services.detail": {
    en: "/services/[slug]",
    "sr-Latn": "/usluge/[slug]",
  },
  "public.team.list": { en: "/team", "sr-Latn": "/tim" },
  "public.team.detail": { en: "/team/[slug]", "sr-Latn": "/tim/[slug]" },
  "public.book": { en: "/book", "sr-Latn": "/zakazi" },
  "public.pricing": { en: "/pricing", "sr-Latn": "/cene" },
  "public.workshops.list": { en: "/workshops", "sr-Latn": "/radionice" },
  "public.workshops.detail": {
    en: "/workshops/[slug]",
    "sr-Latn": "/radionice/[slug]",
  },
  "public.parentSupport": {
    en: "/parent-support",
    "sr-Latn": "/podrska-roditeljima",
  },
  "public.forCompanies": {
    en: "/for-companies",
    "sr-Latn": "/rad-sa-kompanijama",
  },
  "public.knowledge": { en: "/knowledge", "sr-Latn": "/znanje" },
  "public.contact": { en: "/contact", "sr-Latn": "/kontakt" },
  "public.compass.home": { en: "/compass", "sr-Latn": "/kompas" },
  "public.compass.areas": {
    en: "/compass/areas",
    "sr-Latn": "/kompas/oblasti",
  },
  "public.compass.areaDetail": {
    en: "/compass/area/[slug]",
    "sr-Latn": "/kompas/oblast/[slug]",
  },
  "public.compass.topics": {
    en: "/compass/topics",
    "sr-Latn": "/kompas/teme",
  },
  "public.compass.topicDetail": {
    en: "/compass/topic/[slug]",
    "sr-Latn": "/kompas/tema/[slug]",
  },
} as const satisfies Record<string, Record<UiLocale, string>>;

export type PublicRouteId = keyof typeof PUBLIC_ROUTES;

/**
 * Paths that permanently redirect onto a registered route.
 *
 * `/zakazivanje` already behaves this way through the content provider's
 * redirect registry; it is listed for inventory completeness. The workspace
 * entries activate in ROUTE-I18N-3, when `dostupnost` is renamed to `raspored`.
 */
export const ROUTE_ALIASES: Record<string, PlatformRouteId> = {
  "/radni-prostor/dostupnost": "workspace.schedule",
  "/workspace/availability": "workspace.schedule",
};

export function routeDefinition(routeId: PlatformRouteId): RouteDefinition {
  return PLATFORM_ROUTES[routeId];
}

export function platformRouteIds(): PlatformRouteId[] {
  return Object.keys(PLATFORM_ROUTES) as PlatformRouteId[];
}

/**
 * First path segment of every locale path of every registered route.
 *
 * Feeds `PROTECTED_ROUTE_PREFIXES` and the reserved-CMS-slug list, both of
 * which must be derived rather than hand-listed: a hand list is how a locale
 * gets added and an auth gate is forgotten, which is an unauthenticated hole
 * rather than a cosmetic bug.
 */
export function platformRootSegments(): string[] {
  const segments = new Set<string>();
  for (const definition of Object.values(PLATFORM_ROUTES)) {
    for (const path of Object.values(definition.paths)) {
      const first = path.split("/")[1];
      if (first) segments.add(first);
    }
  }
  return [...segments].sort();
}
