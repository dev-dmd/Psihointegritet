import "server-only";

import type { UiLocale } from "@/i18n/locales";
import type { Identity } from "@/lib/auth/identity";
import { getServerIdentity } from "@/lib/auth/identity-server";
import {
  getDeploymentOrganization,
  type OrganizationContext,
} from "@/lib/tenant/org-context";

/**
 * Locale for the **authenticated** surfaces — staff workspace, client panel,
 * superadmin, and every system message, validation and status they render.
 *
 * These routes are already request-time (`ƒ` in the build output): every one of
 * them reads the session through `requireStaff()` / `requireClient()`. Reading
 * request state here therefore costs nothing that is not already spent, and
 * none of them is an SEO surface. This is the whole reason the public and
 * workspace resolvers are separate interfaces rather than one function: a
 * single shared resolver would drag the public site's rendering mode down to
 * the strictest caller.
 *
 * Resolution order (D-077):
 *
 *   1. verified active organization from the authenticated membership
 *   2. `organization.ui_locale`
 *   3. `PLATFORM_DEFAULT_LOCALE`
 *
 * Under C2(a) — one deployment serves one organization — the membership's
 * organization must equal the deployment's. That is asserted rather than
 * assumed: a mismatch means either a user was provisioned into the wrong
 * organization or two organizations have started sharing a host, and both are
 * conditions where guessing a language is the least of the problems. The
 * assertion is what turns a silent wrong-tenant render into a loud failure,
 * and it is the tripwire that will fire on the day someone tries to reach
 * C2(b) without doing the ADR-023 work.
 *
 * Deliberately NOT read here: `Accept-Language`, any browser cookie, any
 * request header. Locale follows the organization, never the visitor.
 */
export interface ActiveWorkspaceLocaleResolver {
  resolve(): Promise<UiLocale>;
}

export class OrganizationMismatchError extends Error {
  constructor(
    readonly membershipOrganizationId: string,
    readonly deploymentSlug: string,
  ) {
    super(
      `Membership organization "${membershipOrganizationId}" does not match ` +
        `deployment organization "${deploymentSlug}". This deployment serves ` +
        `exactly one organization (C2(a), D-077); host-shared multi-tenancy ` +
        `requires the ADR-023 §6.3 milestone.`,
    );
    this.name = "OrganizationMismatchError";
  }
}

export function assertWorkspaceOrganization(
  identity: Identity | null,
  organization: OrganizationContext,
): void {
  const membership = identity?.memberships[0];
  if (membership && membership.organizationId !== organization.slug) {
    throw new OrganizationMismatchError(
      membership.organizationId,
      organization.slug,
    );
  }
}

export const activeWorkspaceLocaleResolver: ActiveWorkspaceLocaleResolver = {
  async resolve(): Promise<UiLocale> {
    // "live": the workspace is request-time rendered, and an administrator
    // who just changed the language must not be shown the old one while the
    // tagged read catches up.
    const [organization, identity] = await Promise.all([
      getDeploymentOrganization("live"),
      getServerIdentity(),
    ]);

    // `memberships` is empty until the backend identity slice lands (see
    // `lib/auth/identity.ts`), and superadmins legitimately hold none. Both are
    // normal states, not mismatches — fall through to the deployment locale.
    assertWorkspaceOrganization(identity, organization);

    return organization.uiLocale;
  },
};

/** Convenience wrapper — the authenticated surfaces' language. */
export async function resolveWorkspaceLocale(): Promise<UiLocale> {
  return activeWorkspaceLocaleResolver.resolve();
}
