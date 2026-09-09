import {
  ACCESS_DENIED_PATH,
  RESET_PASSWORD_PATH,
  SIGN_IN_PATH,
  SIGN_UP_PATH,
  VERIFY_EMAIL_PATH,
} from "./auth-paths";
import {
  clientRoutePrefixes,
  hasRoutePrefix,
  isHostNeutralPath,
  normalizePathname,
} from "./match";
import { platformRootSegments } from "./platform-routes";
import {
  PLATFORM_HOME_ROUTE,
  TENANT_ROUTE_PREFIX,
  type TenantDomainConfig,
  tenantForSlug,
} from "@/lib/tenant/domain-registry";

/**
 * Whether a path on a tenant host is served from that tenant's own segment.
 *
 * The companion to `isSurfaceAllowedOnHost`, and the two must be read together:
 * one answers *may this host serve it*, the other *where does it live*. Saying
 * yes to the first and then rewriting somewhere nothing exists is a 404 that
 * looks like a missing page rather than a routing bug, which is exactly how
 * `/prijava` and every `/api/*` handler came to answer 404 on
 * `sanja-neuer.vercel.app` while working on `psihointegritet.com`.
 *
 * Three kinds of path stay where they are:
 *
 * 1. **Host-neutral paths** — the auth pages and every Route Handler. They are
 *    top-level files; there is no `app/s/[organizationSlug]/prijava` and no
 *    `app/s/[organizationSlug]/api`. They still get stamped with the tenant, so
 *    a client signing in on Sanja's domain is scoped to Sanja — the stamp is
 *    what carries the tenant, not the URL shape.
 * 2. **The client area.** Behind authentication and request-time already, so
 *    the guard reads the tenant from the stamp; moving five pages under the
 *    segment would buy nothing.
 * 3. **The founding tenant's legacy public tree**, until PDC-1 moves it.
 *
 * Everything else is a tenant's public page and belongs under the segment.
 *
 * `psihointegritet.com` hid this for as long as it did precisely because rule 3
 * covers it: with `usesLegacyPublicTree` set, *nothing* on that host is
 * rewritten, so the missing rule never showed. The first tenant without it was
 * the first tenant to lose its sign-in page.
 */
export function servedFromTenantSegment(
  pathname: string,
  tenant: { usesLegacyPublicTree?: boolean },
): boolean {
  if (isHostNeutralPath(pathname)) return false;
  if (hasRoutePrefix(pathname, clientRoutePrefixes())) return false;
  if (tenant.usesLegacyPublicTree) return false;
  return true;
}

/**
 * Paths that exist only as the *result* of a rewrite, never as an address.
 *
 * `/s/<slug>/…` is where a tenant's pages physically live and `/platform-home`
 * is what the platform host's `/` becomes. Reaching either directly would give
 * one page a second URL — and in the tenant segment's case, a URL that names a
 * tenant the host has no business serving. Bare `/s` is included: it is not a
 * route, and letting it through only to 404 later reads as a missing page.
 */
export function isInternalOnlyPath(pathname: string): boolean {
  const normalized = normalizePathname(pathname);
  return (
    normalized === TENANT_ROUTE_PREFIX ||
    normalized.startsWith(`${TENANT_ROUTE_PREFIX}/`) ||
    normalized === PLATFORM_HOME_ROUTE
  );
}

/**
 * First path segments this application owns, so none of them may name a tenant.
 *
 * **Derived, never hand-written.** A hand-written list is how a locale gets
 * added, a route root moves, and `/nalog` silently becomes a tenant slug — the
 * same failure `platformRootSegments()` was written to prevent for CMS slugs.
 * Every entry here comes from the module that already owns that name.
 *
 * Public route roots (`usluge`, `kompas`, `tim`) are deliberately **absent**.
 * The platform host never serves a tenant's public tree — `isSurfaceAllowedOnHost`
 * refuses it — so the root `[documentSlug]` catch-all is unreachable from here
 * and creates no ambiguity. Reserving them would instead forbid a future tenant
 * from being slugged `tim`, which is a real name.
 */
export function reservedFirstSegments(): readonly string[] {
  const segments = new Set(platformRootSegments());
  for (const path of [
    SIGN_IN_PATH,
    SIGN_UP_PATH,
    RESET_PASSWORD_PATH,
    VERIFY_EMAIL_PATH,
    ACCESS_DENIED_PATH,
    TENANT_ROUTE_PREFIX,
    PLATFORM_HOME_ROUTE,
  ]) {
    const first = path.split("/")[1];
    if (first) segments.add(first);
  }
  segments.add("api");
  return [...segments].sort();
}

const RESERVED_FIRST_SEGMENTS: ReadonlySet<string> = new Set(
  reservedFirstSegments(),
);

export interface TenantPathPrefix {
  tenant: TenantDomainConfig;
  /** `/sanja-neuer` — re-attached to redirect targets and to the return path. */
  prefix: string;
  /** The path with the prefix removed; `/` when the prefix was the whole path. */
  path: string;
}

/**
 * The tenant a first path segment names, or `null` when it names none.
 *
 * This is how every environment except production addresses a tenant:
 * `staging.example.com/sanja-neuer/…` rather than a subdomain that would need
 * wildcard DNS and a wildcard certificate to exist at all.
 *
 * **Naming a tenant is not being one.** An unregistered slug returns `null`
 * rather than an empty tenant, so the request continues as a platform path and
 * meets the ordinary refusal — the same answer, and the same reason, as
 * `resolveHostBinding` gives a hostname nobody registered.
 */
export function tenantPathPrefix(pathname: string): TenantPathPrefix | null {
  const normalized = normalizePathname(pathname);
  const first = normalized.split("/")[1];
  if (!first || RESERVED_FIRST_SEGMENTS.has(first)) return null;

  const tenant = tenantForSlug(first);
  if (!tenant) return null;

  const rest = normalized.slice(`/${first}`.length);
  return { tenant, prefix: `/${first}`, path: rest === "" ? "/" : rest };
}
