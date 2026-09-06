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
   * Which backend answers for this tenant.
   *
   * One frontend project cannot carry one API URL in an environment variable
   * any more, and the tenants still have separate databases (deliberately —
   * RLS does not exist yet), so the API target belongs next to the tenant.
   */
  apiBaseUrl: string;
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
    apiBaseUrl: "https://diligent-serenity-production-1b3e.up.railway.app",
    usesLegacyPublicTree: true,
  },
  {
    organizationSlug: "sanja-neuer",
    domains: ["sanjaneuer.com", "www.sanjaneuer.com"],
    publicUrl: "https://sanjaneuer.com",
    apiBaseUrl: "https://diligent-serenity-sanja-production.up.railway.app",
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
