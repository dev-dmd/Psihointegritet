import { type Identity, staffMemberships } from "@/lib/auth/identity";
import { localizedPath } from "@/lib/routes/localized-path";
import type { UiLocale } from "@/i18n/locales";
import {
  type TenantDomainConfig,
  tenantForSlug,
  tenantSiteUrl,
} from "@/lib/tenant/domain-registry";

/**
 * Where a person belongs immediately after signing in.
 *
 * Pure, provider-neutral and surface-aware — the decision, not the redirect.
 * The Route Handler that performs it is deliberately thin, because this is the
 * part that needs to be readable and tested: it decides who may enter the
 * platform at all.
 *
 * # Why a dispatcher exists at all
 *
 * `ClerkProvider` used to answer this with one constant, `/nalog`. That was
 * true while every host was the founding tenant's: everyone who signed in was
 * somebody's client, and the workspace was reached by typing its address.
 *
 * It stops being true on a platform-only host, where `/nalog` is deliberately
 * **404** — the client area belongs to a tenant, and the platform owns no
 * tenant. A protected route carries `redirect_url` and lands correctly; someone
 * who simply opens `p-digital-center.com/prijava` carries nothing, and the
 * constant would have sent them to a page that does not exist there.
 */

/** The surface the sign-in was initiated from, as the proxy stamped it. */
export interface LandingContext {
  surface: "tenant" | "platform";
  /** The tenant whose host this is, when on a tenant surface. */
  tenantSlug: string | null;
  locale: UiLocale;
  /**
   * Which deployment this is, so a client sent to their practitioner's site
   * lands in the environment they signed in to rather than on the live one.
   *
   * Supplied by the caller rather than read here, for the same reason `surface`
   * is: this module stays a pure function of the request's context.
   */
  deploymentEnv: string | null;
}

export type Landing =
  | { kind: "platform"; path: string }
  | { kind: "tenant"; url: string }
  | { kind: "denied" };

/**
 * A person's destination, given who they are and where they signed in.
 *
 * Order matters and encodes the product, not convenience:
 *
 * 1. **A superadmin** goes to the operator console. It is a global flag, so it
 *    outranks every membership and does not depend on the host.
 * 2. **Staff** go to the workspace on the platform. Which organization they
 *    work in comes from their membership, never from the address they arrived
 *    at — that is the B2-1 rule, applied to landing rather than to guards.
 * 3. **A client on a tenant host** stays exactly where they are. Someone
 *    booking with Sanja never needs to learn that a platform exists.
 * 4. **A client who arrived through the platform** is sent back to their own
 *    practitioner's site, but only when their membership names exactly one.
 *    With none or several there is no honest answer, and guessing would drop
 *    somebody into a practice that is not theirs.
 * 5. **Anything else is refused**, visibly. A person with a valid session and
 *    no place to be is a real state — an account provisioned but not yet given
 *    a role — and it deserves a page that says so rather than a 404.
 */
export function resolveLanding(
  identity: Identity | null,
  context: LandingContext,
): Landing {
  if (!identity) return { kind: "denied" };

  if (identity.isSuperadmin) {
    return {
      kind: "platform",
      path: localizedPath("superadmin.home", { locale: context.locale }),
    };
  }

  const staff = staffMemberships(identity.memberships);
  if (staff.length > 0) {
    return {
      kind: "platform",
      path: localizedPath("workspace.home", { locale: context.locale }),
    };
  }

  const clientPath = localizedPath("account.home", { locale: context.locale });

  if (context.surface === "tenant" && context.tenantSlug) {
    // Already on the right host: keep the URL relative so the person never
    // leaves the practice they came to.
    return { kind: "platform", path: clientPath };
  }

  const home = soleClientTenant(identity, context);
  if (home)
    return {
      kind: "tenant",
      url: `${tenantSiteUrl(home, context.deploymentEnv)}${clientPath}`,
    };

  return { kind: "denied" };
}

/**
 * The one tenant a client belongs to, or `null` when that is not a single answer.
 *
 * Deliberately strict. A client with memberships in two practices has two
 * equally valid homes and the platform must not pick one for them; a client
 * with none has nowhere to go at all. Both end in the refusal above, which is
 * honest, rather than in a redirect that looks like a decision.
 */
function soleClientTenant(
  identity: Identity,
  context: LandingContext,
): TenantDomainConfig | null {
  void context;
  const registered = identity.memberships
    .map((membership) => tenantForSlug(membership.organizationSlug))
    .filter((tenant): tenant is TenantDomainConfig => tenant !== undefined);
  return registered.length === 1 ? (registered[0] ?? null) : null;
}
