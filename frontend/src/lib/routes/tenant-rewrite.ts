import {
  clientRoutePrefixes,
  hasRoutePrefix,
  isHostNeutralPath,
} from "./match";

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
