/**
 * Which organization a hostname belongs to, and where that organization's own
 * surfaces live.
 *
 * This is the B2 tenant boundary (D-077 A7). One frontend project serves every
 * tenant; the request's host decides which one, and this table is the only
 * place that mapping exists.
 *
 * # Two kinds of host, deliberately not the same type
 *
 * **Tenant hosts** carry a tenant's public site and its *clients*: the site
 * itself, booking and intake entry points, and `/nalog`. Someone booking with
 * Sanja never needs to know P. Digital Centar exists — for them the product is
 * her space.
 *
 * **The platform host** carries the *owners*: `/radni-prostor`, `/superadmin`,
 * tenant management. Both tenants' owners work on the same platform host, and
 * which organization they are working in comes from their membership, not from
 * the address bar. That is why the platform is modelled here as its own thing
 * rather than as a tenant with no content — it is not a tenant.
 *
 * # The platform host is configuration, not a constant
 *
 * It is read from `PLATFORM_HOST` precisely because it is about to change:
 * today the workspace answers on the founding tenant's domain, tomorrow on
 * `p-digital-center.com`. Writing today's value into this file would turn that
 * move into a refactor instead of an env change — and would re-assert exactly
 * the "Psihointegritet is the platform" identity that D-080 retired.
 */

export interface TenantDomainConfig {
  /** The organization this host serves. Matches `organizations.slug`. */
  organizationSlug: string;
  /** Every hostname that resolves to this tenant, apex and `www` alike. */
  domains: string[];
  /** Canonical public origin — the value canonical tags and sitemaps use. */
  publicUrl: string;
  /**
   * Which backend answers for this tenant **in production**.
   *
   * Production is the only environment that serves more than one tenant, so it
   * is the only one that cannot name its backend in a single environment
   * variable. Every other environment is bound to one tenant and one backend
   * (`NEXT_PUBLIC_API_URL`): staging talks to the staging backend, a laptop to
   * `localhost:8001`.
   *
   * The name says `production` because the first version of it did not, and a
   * local sign-in silently called the production API, got a 401 for a
   * development token, and rendered a workspace with no panels in it.
   *
   * **Transitional, and the wrong shape on purpose (D-081).** An API base
   * belongs to an *environment*, not to a tenant — one production API, one
   * staging API, with the tenant arriving per request as
   * `organizationSlug → organization_id → scoped query`. This field exists only
   * because two production backends genuinely exist today, each with its own
   * database, which is the only tenant isolation there is until RLS lands. It
   * is deleted when they become one; the rest of this table
   * (`organizationSlug`, `domains`, `publicUrl`) is the part that stays.
   *
   * Plan: `documentations/PDC_CONSOLIDATION_MIGRATION_PLAN_v1_0.md`.
   */
  productionApiBaseUrl: string;
  /**
   * Where this tenant's site can actually be reached **today**, when that is
   * not yet its canonical domain.
   *
   * Two different questions were one field until Sanja's DNS became
   * unavailable, and they are not the same:
   *
   * ```
   * publicUrl           what the site IS      canonical, SEO, the address she prints
   * temporaryAccessUrl  where it ANSWERS      a link that works this week
   * ```
   *
   * `publicUrl` deliberately stays `https://sanjaneuer.com` while that domain
   * is dead. Pointing canonical at a `.vercel.app` host would ask Google to
   * index the temporary address as the real one, and the cleanup afterwards is
   * a domain migration rather than a deleted line.
   *
   * **Temporary by construction.** It is deleted the day `sanjaneuer.com`
   * resolves — together with the host in `domains` and the `X-Robots-Tag` the
   * proxy stamps for it. Nothing else in the registry knows it exists.
   *
   * Plan: `PDC_CONSOLIDATION_MIGRATION_PLAN_v1_1.md` §8.3.
   */
  temporaryAccessUrl?: string;
  /**
   * **Transitional.** The founding tenant's ~26 public pages still live in
   * `app/(public)` with their copy written for that one organization. Moving
   * them under `app/s/[organizationSlug]` is PDC-1's job, together with the
   * page model that makes the copy tenant-authored rather than hardcoded.
   *
   * Until then this host's *public* requests pass through untouched, while its
   * client surface is rewritten like every other tenant's. The asymmetry is
   * visible on purpose: it should look temporary, because it is.
   */
  usesLegacyPublicTree?: boolean;
}

export const TENANT_DOMAINS: readonly TenantDomainConfig[] = [
  {
    organizationSlug: "psihointegritet",
    // Production hosts only. Staging, QA and a laptop reach this tenant as
    // `<platform host>/psihointegritet` — a path prefix, not a hostname — so
    // there is nothing for them to list here. See `tenantPathsEnabled`.
    domains: ["psihointegritet.com", "www.psihointegritet.com"],
    publicUrl: "https://psihointegritet.com",
    productionApiBaseUrl:
      "https://diligent-serenity-production-1b3e.up.railway.app",
    usesLegacyPublicTree: true,
  },
  {
    organizationSlug: "sanja-neuer",
    // `sanja-neuer.vercel.app` is listed explicitly, never as a `*.vercel.app`
    // wildcard: a wildcard would make every preview hostname on the platform a
    // trusted route into this tenant.
    domains: ["sanjaneuer.com", "www.sanjaneuer.com", "sanja-neuer.vercel.app"],
    publicUrl: "https://sanjaneuer.com",
    temporaryAccessUrl: "https://sanja-neuer.vercel.app",
    productionApiBaseUrl:
      "https://diligent-serenity-sanja-production.up.railway.app",
  },
];

/** Strip the port and lowercase, so `Host` matches the table as written. */
export function normalizeHost(host: string | null | undefined): string {
  return (host ?? "").split(":")[0]?.trim().toLowerCase() ?? "";
}

/** The tenant this hostname belongs to, or `undefined` when it belongs to none. */
export function tenantForHost(
  host: string | null | undefined,
): TenantDomainConfig | undefined {
  const normalized = normalizeHost(host);
  if (normalized === "") return undefined;
  return TENANT_DOMAINS.find((tenant) => tenant.domains.includes(normalized));
}

/**
 * Whether tenants are addressed by a path prefix on the platform host.
 *
 * True everywhere except production. Production tenants have real domains and
 * must keep them: the whole point of the product is that someone booking with
 * Sanja sees her address, not ours.
 *
 * Nowhere else can have that. A tenant on staging would have to be
 * `sanja-neuer.staging.<host>`, which needs wildcard DNS and a wildcard
 * certificate — infrastructure nobody is buying for a test environment — and
 * `*.localhost` resolves in two browsers and in neither `curl` nor Playwright.
 * So the environments that most need to serve a tenant were the ones that
 * could not.
 *
 * `!== "production"` rather than a list of the other three: `DEPLOYMENT_ENV` is
 * a Zod enum (`lib/validation/env.ts`), so a misspelling fails the build rather
 * than silently landing in the wrong branch, and the same shape already decides
 * the API base in `session/server-identity.ts`. The fail-open direction is
 * narrow and covered — a registered domain binds by host *before* any path is
 * examined, so no production tenant is reachable this way.
 */
export function tenantPathsEnabled(env: string | null | undefined): boolean {
  return env !== "production";
}

/**
 * The prefix every in-tenant link carries in this environment: `/sanja-neuer`
 * outside production, `""` in it.
 *
 * One rule with two consumers — the proxy strips it on the way in, the link
 * builders add it on the way out — because a prefix stripped by one rule and
 * added by another is a prefix that drifts.
 */
export function tenantBasePath(
  slug: string,
  env: string | null | undefined,
): string {
  return tenantPathsEnabled(env) ? `/${slug}` : "";
}

/**
 * The address to *send someone to* for this tenant's site, **in the environment
 * asking**.
 *
 * Outside production this is a same-origin path, which is the point: an owner
 * testing on staging who clicks "go to site" must stay on staging. It used to
 * return the production URL unconditionally, so every such click left the
 * environment under test — and the post-sign-in redirect sent a client from
 * staging to the live site.
 *
 * In production it prefers the temporary host precisely because the canonical
 * one may not resolve yet: "Idi na sajt" has to open a page, and a link to a
 * dead domain is worse than a link to an ugly one.
 *
 * Never use this for canonical, sitemaps or anything an indexer reads. That is
 * `publicUrl`, always — and it stays absolute in every environment.
 */
export function tenantSiteUrl(
  tenant: TenantDomainConfig,
  env: string | null | undefined,
): string {
  const basePath = tenantBasePath(tenant.organizationSlug, env);
  if (basePath !== "") return basePath;
  return tenant.temporaryAccessUrl ?? tenant.publicUrl;
}

/**
 * The one tenant whose public pages have not moved under `app/s/` yet.
 *
 * Derived from the flag rather than named, so it disappears with the flag when
 * PDC-1 moves that tree — a hardcoded `"psihointegritet"` would outlive the
 * reason it was written.
 */
export function legacyPublicTreeTenant(): TenantDomainConfig | undefined {
  return TENANT_DOMAINS.find((tenant) => tenant.usesLegacyPublicTree);
}

/**
 * Is this host a temporary stand-in rather than a tenant's real domain?
 *
 * Derived from `temporaryAccessUrl` rather than listed a second time, so the
 * two cannot drift apart — deleting that one field retires the host, the
 * `noindex` the proxy stamps for it, and this predicate together.
 *
 * The proxy uses it to keep the stand-in out of search results while
 * `publicUrl` keeps naming the domain that should eventually be there.
 */
export function isTemporaryAccessHost(
  host: string | null | undefined,
): boolean {
  const normalized = normalizeHost(host);
  if (normalized === "") return false;
  return TENANT_DOMAINS.some((tenant) => {
    if (!tenant.temporaryAccessUrl) return false;
    return (
      normalizeHost(new URL(tenant.temporaryAccessUrl).hostname) === normalized
    );
  });
}

/** The tenant with this slug, or `undefined` when it is not registered. */
export function tenantForSlug(slug: string): TenantDomainConfig | undefined {
  return TENANT_DOMAINS.find((tenant) => tenant.organizationSlug === slug);
}

/**
 * Hosts that serve the platform control plane rather than a tenant.
 *
 * `PLATFORM_HOST` names the canonical one. Development hosts are included so a
 * laptop reaches the workspace without editing `/etc/hosts`; they are matched
 * by exact name rather than by a wildcard, so nothing on a real domain can
 * accidentally be treated as the platform.
 */
export function platformHosts(): string[] {
  const configured = normalizeHost(process.env.PLATFORM_HOST);
  return [configured, "localhost", "127.0.0.1"].filter((host) => host !== "");
}

export function isPlatformHost(host: string | null | undefined): boolean {
  return platformHosts().includes(normalizeHost(host));
}

export class MissingPlatformHostError extends Error {
  constructor(readonly deploymentEnv: string) {
    super(
      `DEPLOYMENT_ENV is "${deploymentEnv}" but PLATFORM_HOST is not set. ` +
        `Owner surfaces (/radni-prostor, /superadmin) answer only on the platform ` +
        `host, so without it every deployed domain refuses them and the workspace ` +
        `becomes unreachable. Set PLATFORM_HOST to the host that serves the ` +
        `workspace — today the founding tenant's domain, later p-digital-center.com.`,
    );
    this.name = "MissingPlatformHostError";
  }
}

/**
 * The platform host a deployed environment must declare.
 *
 * Mirrors `resolveDeploymentSlug`, and for the same reason: on a laptop an
 * unset value is a convenience, on a deployment it means somebody forgot. The
 * cost of forgetting is specific and severe — the owners' workspace answers
 * nowhere — so it is refused at build time, where `serverEnv` loads, rather
 * than discovered by an owner who cannot sign in.
 */
export function resolvePlatformHost(
  host: string | null | undefined,
  deploymentEnv: string | null | undefined,
): string {
  const provided = normalizeHost(host);
  if (provided !== "") return provided;

  if (
    deploymentEnv === "staging" ||
    deploymentEnv === "production" ||
    deploymentEnv === "preview"
  ) {
    throw new MissingPlatformHostError(deploymentEnv);
  }
  return "";
}

/*
 * There used to be a `tenantSlugFromHost` here, reading a tenant out of
 * `<slug>.<platform host>` so that a laptop and a staging deployment resolved
 * tenants exactly the way production does. It is gone, and its two arguments
 * deserve answers rather than deletion, because both were true.
 *
 * *"Development would exercise a different resolver than the one that ships."*
 * It now does, and the cost is paid deliberately. The resolvers differ by
 * exactly one step — a path prefix stripped before anything else — after which
 * the pipeline is identical to production's, host binding included. What the
 * subdomain scheme bought with that symmetry it paid for by making the one host
 * that has to work unreachable: `sanja-neuer.staging.<host>` needs wildcard DNS
 * and a wildcard certificate, and `*.localhost` resolves in two browsers and in
 * neither `curl` nor Playwright.
 *
 * *"It would need a reserved-word list kept in sync with every platform route
 * forever."* This turned out to be free. `reservedFirstSegments()` derives the
 * list from `platformRootSegments()` — which already existed, for the CMS
 * reserved-slug list — plus four constants in `auth-paths.ts` and three here.
 * Nothing is hand-written, so nothing can drift, and a test asserts no
 * registered tenant slug collides with it.
 *
 * There is also a correctness reason the two schemes cannot simply coexist:
 * links inside a tenant's pages must carry `/<slug>` outside production, and
 * those pages are prerendered, so the prefix is decided at build time. Two ways
 * in would prerender `/sanja-neuer/tim` and then serve it under
 * `sanja-neuer.staging.<host>`, which is that path twice.
 *
 * `isUnderPlatformHost` below now does the whole job: `sanja-neuer.localhost`
 * is beneath a platform host, names no tenant, and is refused.
 */

/**
 * Is this host inside a platform host's namespace at all?
 *
 * Separate from the tenant lookup because "names no valid tenant" and "has
 * nothing to do with us" must not get the same answer. `a.b.localhost` yields
 * no slug, but it is still a name beneath the platform, so serving it the
 * platform would give the same page two addresses — and would do it under a
 * hostname shaped like a tenant's.
 */
function isUnderPlatformHost(host: string | null | undefined): boolean {
  const normalized = normalizeHost(host);
  if (normalized === "") return false;
  return platformHosts().some((platform) =>
    normalized.endsWith(`.${platform}`),
  );
}

/**
 * What a host resolves to, once every rule has been applied.
 *
 * A discriminated union rather than `{ tenant?, isPlatform }`, because that
 * shape let a host be **both** — and while the founding tenant's domain was
 * also the platform's, it genuinely was. It no longer is: production separates
 * them by domain, and outside production the platform host serves the platform
 * while a tenant is named by the path beneath it. Keeping the old shape would
 * keep "both" representable, and every consumer would have to keep asking which
 * half of it to trust — the ambiguity that put the owners' workspace and a
 * tenant's public tree on one address.
 *
 * `null` means nobody's — the request is refused.
 */
export type HostBinding =
  { kind: "platform" } | { kind: "tenant"; tenant: TenantDomainConfig };

const PLATFORM_BINDING: HostBinding = { kind: "platform" };

/**
 * Which surface this host serves, and for a tenant surface, whose.
 *
 * **A hostname only ever names a tenant through the registry.** Nothing is
 * inferred from a host's shape, in any environment. Outside production a tenant
 * is named by the *path* instead (`tenantPathPrefix`), which the proxy applies
 * after this function has already answered — so this stays purely about hosts.
 *
 * In order of how specific each answer is:
 *
 * 1. A **registered domain** names its tenant. Production's custom domains stay
 *    explicit mappings; nothing is inferred from their shape.
 * 2. The **platform host** serves the platform and no tenant. `localhost` and
 *    `127.0.0.1` are platform hosts too, so a laptop opens P. Digital Centar
 *    rather than somebody's public site.
 * 3. **Production refuses anything else.** A host nobody registered must not
 *    reach a tenant's site, and on production there is no deployment URL to
 *    excuse: the domain is either ours or it is somebody pointing DNS at us.
 * 4. **Anything beneath a platform host is refused** — `sanja-neuer.localhost`,
 *    `a.b.localhost` alike. It once named a tenant; now a name shaped like a
 *    tenant's, that the registry does not list as a domain, is nobody's.
 * 5. A **deployment URL** — `p-digital-center-<hash>.vercel.app`, minted per
 *    deployment and listable by no table — serves the platform, so a branch can
 *    still be reviewed from its preview link. It reaches no tenant, because it
 *    names none.
 *
 * The tenant no longer arrives from `DEFAULT_ORGANIZATION_SLUG`. That fallback
 * attached the founding tenant to any unrecognised non-production host,
 * including the bare platform host — which is why `localhost:3007` served
 * Psihointegritet's home page instead of the platform's, and why staging could
 * not tell the two surfaces apart at all.
 */
export function resolveHostBinding(
  host: string | null | undefined,
  deployment: { env: string | null | undefined },
): HostBinding | null {
  const registered = tenantForHost(host);
  if (registered) return { kind: "tenant", tenant: registered };

  if (isPlatformHost(host)) return PLATFORM_BINDING;

  // Production is literal: a host that names no tenant serves no tenant.
  if (deployment.env === "production") return null;

  // Beneath the platform host — `sanja-neuer.localhost`, `a.b.localhost`.
  // Refused rather than served the platform, which would hand one page a second
  // address under a tenant-shaped name.
  if (isUnderPlatformHost(host)) return null;

  return PLATFORM_BINDING;
}

/**
 * What the platform calls itself.
 *
 * The product name, not a domain — safe to state here, unlike the host. It is
 * what an owner sees above their workspace, and it must never be a tenant's
 * name: P. Digital Centar is the platform both tenants work inside, and
 * Psihointegritet stopped being its identity with D-080.
 */
export const PLATFORM_NAME = "P. Digital Centar";

/** Internal segment the proxy rewrites tenant requests onto. */
export const TENANT_ROUTE_PREFIX = "/s";

/**
 * Internal path holding the platform's own front page.
 *
 * A plain segment, not a `_`-prefixed folder: App Router treats `_name` as a
 * private folder and produces no route at all, which the B2 spike found the
 * hard way. Refused from outside by the proxy for the same reason the tenant
 * tree is — one page must not be reachable at two addresses.
 */
export const PLATFORM_HOME_ROUTE = "/platform-home";

/**
 * Headers the proxy stamps so request-time code knows which surface it is on
 * without re-deriving it.
 *
 * Read only from request-time code — guards and the identity fetch. Never from
 * the SSG-safe modules: public pages take the tenant from their route param,
 * which is what keeps them prerenderable.
 */
export const TENANT_SURFACE_HEADER = "x-pdc-surface";
export const TENANT_SLUG_HEADER = "x-pdc-tenant";

export type Surface = "tenant" | "platform";
