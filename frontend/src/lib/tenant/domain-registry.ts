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
    domains: [
      "psihointegritet.com",
      "www.psihointegritet.com",
      "staging.psihointegritet.com",
      "qa.psihointegritet.com",
    ],
    publicUrl: "https://psihointegritet.com",
    productionApiBaseUrl:
      "https://diligent-serenity-production-1b3e.up.railway.app",
    usesLegacyPublicTree: true,
  },
  {
    organizationSlug: "sanja-neuer",
    domains: ["sanjaneuer.com", "www.sanjaneuer.com"],
    publicUrl: "https://sanjaneuer.com",
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

/**
 * What a host resolves to, once every rule has been applied.
 *
 * `null` means nobody's — the request is refused.
 */
export interface HostBinding {
  tenant: TenantDomainConfig | undefined;
  isPlatform: boolean;
}

/**
 * Which tenant and which surfaces this host may serve.
 *
 * Three answers, in order of how specific they are:
 *
 * 1. A **registered domain** names its tenant, and separately may also be the
 *    platform host — the founding tenant's domain is both today.
 * 2. A **deployment URL without a custom domain** — every Vercel preview gets
 *    one — names nothing, because no table can list a hostname that is minted
 *    per deployment. There the deployment's own tenant binding is still true
 *    and still the answer, which is C2(a) surviving exactly where it remains
 *    correct rather than as a general fallback. Such a host serves both
 *    surfaces, so a branch can be reviewed end to end from its preview link.
 * 3. **Production refuses anything else.** A host nobody registered must not
 *    reach a tenant's site, and on production there is no deployment URL to
 *    excuse: the domain is either ours or it is somebody pointing DNS at us.
 */
export function resolveHostBinding(
  host: string | null | undefined,
  deployment: { env: string | null | undefined; slug: string },
): HostBinding | null {
  const tenant = tenantForHost(host);
  const isPlatform = isPlatformHost(host);
  if (tenant) return { tenant, isPlatform };

  // Production is literal: a host that names no tenant serves no tenant. The
  // platform host legitimately owns none, and anything else is refused.
  if (deployment.env === "production") {
    return isPlatform ? { tenant: undefined, isPlatform } : null;
  }

  // Everywhere else the deployment is bound to one tenant, and no host names
  // it — `localhost` and a preview URL are both unlistable. Note this applies
  // to `localhost` *even though it is the platform host*: a laptop is the
  // platform and the tenant at once, and treating it as platform-only left
  // `/nalog` answering 404 on a developer's own machine.
  const bound = tenantForSlug(deployment.slug);
  if (bound) return { tenant: bound, isPlatform: true };
  return isPlatform ? { tenant: undefined, isPlatform } : null;
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
