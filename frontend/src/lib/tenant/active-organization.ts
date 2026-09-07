import "server-only";

import { headers } from "next/headers";

import { staffMemberships } from "@/lib/auth/identity";
import { getServerIdentity } from "@/lib/auth/identity-server";
import {
  TENANT_SLUG_HEADER,
  TENANT_SURFACE_HEADER,
  type Surface,
} from "@/lib/tenant/domain-registry";
import { getDeploymentOrganization } from "@/lib/tenant/org-context";

/**
 * Which organization the current request is acting in — the seam every
 * authorization check asks through (B2-1).
 *
 * # Two surfaces, two different questions, two named resolvers
 *
 * The answer does not come from one place, because the question is not one
 * question:
 *
 * - On a **tenant surface** — a tenant's public site and its clients' `/nalog`
 *   — the organization is whichever one owns the domain. A visitor to
 *   `sanjaneuer.com` is in Sanja's space no matter who they are, or whether
 *   they are anyone at all.
 * - On the **platform surface** — the owners' workspace — the organization is
 *   whichever one the signed-in person is working in. Both tenants' owners
 *   share one host, so the address bar cannot answer it; their membership can.
 *
 * These are kept as separate functions on purpose. A single helper that
 * inspected both and returned whichever it found would work until the day both
 * were present, and then quietly prefer one — which is how a workspace ends up
 * scoped by whatever domain someone happened to arrive on.
 *
 * The dispatch below is explicit rather than a guess: the proxy stamps which
 * surface the request is on, because it is the only layer that already knows.
 *
 * # Never in the render path
 *
 * `headers()` here is a request-time API and this module must stay out of
 * prerendered pages. Public pages take their tenant from the `/s/[slug]` route
 * param instead, which is what keeps them static — the guards that call this
 * are all behind authentication and request-time already.
 */

/** Which surface the proxy stamped on this request, if any. */
export async function surfaceOfRequest(): Promise<Surface | null> {
  return surface();
}

async function surface(): Promise<Surface | null> {
  const value = (await headers()).get(TENANT_SURFACE_HEADER);
  return value === "tenant" || value === "platform" ? value : null;
}

/** The organization that owns this hostname. Public and client surfaces. */
export async function resolveTenantSurfaceOrganization(): Promise<
  string | null
> {
  return (await headers()).get(TENANT_SLUG_HEADER);
}

/**
 * The organization the signed-in person is working in. Platform surface only.
 *
 * **Staff memberships only.** This used to sort every membership by slug and
 * take the first, which is wrong for anyone who is a client somewhere and staff
 * somewhere else: a therapist at `psihointegritet` who is also a client of
 * `alpha-praksa` would open the workspace of a practice where they have no
 * staff role at all, purely because the slug sorts earlier. Filtering first
 * makes the answer "where do you work", which is the question being asked.
 *
 * With several staff memberships this stays deterministic — first by slug — and
 * that is a placeholder, not a decision. The real answer is an organization
 * switcher in the workspace; until it exists, someone who is staff at two
 * practices sees the alphabetically first one and has no way to change it.
 */
export async function resolveWorkspaceOrganization(): Promise<string | null> {
  const identity = await getServerIdentity();
  if (!identity) return null;
  return staffMemberships(identity.memberships)[0]?.organizationSlug ?? null;
}

/**
 * The active organization, resolved from whichever surface this request is on.
 *
 * Falls back to the deployment's organization only where neither resolver can
 * answer — a superadmin holding no membership rows (D-051), and local
 * development where no proxy header was stamped. It is a fallback of last
 * resort rather than a default: it can only ever name the founding tenant, and
 * B2 exists precisely so that stops being the answer to an unasked question.
 */
export async function getActiveOrganizationSlug(): Promise<string> {
  const current = await surface();

  if (current === "tenant") {
    const slug = await resolveTenantSurfaceOrganization();
    if (slug) return slug;
  }

  if (current === "platform") {
    const slug = await resolveWorkspaceOrganization();
    if (slug) return slug;
  }

  return (await getDeploymentOrganization()).slug;
}
