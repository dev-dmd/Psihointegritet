import "server-only";

import {
  findOrganizationLocaleSettings,
  type OrganizationLocaleSettings,
} from "@/lib/tenant/organizations";
import { serverEnv } from "@/lib/validation/env";

/**
 * Which organization this deployment serves, and what languages it speaks.
 *
 * **C2(a), locked 2026-08-11: one deployment = one organization.** Host-shared
 * multi-tenancy is not implemented here and must not be smuggled in through
 * i18n or `proxy.ts` — it belongs to ADR-023 §6.3, the RLS rollout and its own
 * approved milestone. So `DEFAULT_ORGANIZATION_SLUG` *is* verified organization
 * identity: no host parsing, no hostname → organization lookup, no cookie, no
 * database, and no per-request input of any kind.
 *
 * That last property is load-bearing rather than incidental. Next.js treats
 * `headers()` and `cookies()` as request-time APIs, and this module is reached
 * from `i18n/request.ts`, which runs inside every translated render including
 * the root layout. One request-API call here would opt the whole public site
 * out of static rendering. `process.env` and a checked-in table are known
 * without an incoming request, so SSG and ISR survive.
 *
 * This module answers only "which organization". **Which locale** is asked
 * through one of two resolvers, deliberately separate so the public surface is
 * never dragged into the workspace's rendering mode:
 *
 * - `lib/tenant/public-locale.ts` → `default_content_locale`, SSG/ISR-safe
 * - `lib/tenant/workspace-locale.ts` → `ui_locale`, request-time
 *
 * TODO(org-backend): when `GET /api/v1/organizations/me` lands (I18N-7), this
 * reads a cached organization config under a statically known organization id
 * rather than the checked-in table. Still no request state. Call sites do not
 * change — which is why this returns a promise today despite doing no async
 * work, matching the seam shape of `lib/auth/identity-server.ts`.
 */

export interface OrganizationContext extends OrganizationLocaleSettings {
  /** Organization slug — the `organization_id` boundary's public handle. */
  slug: string;
}

export class UnknownOrganizationError extends Error {
  constructor(readonly slug: string) {
    super(
      `Unknown organization slug "${slug}". Register it in ` +
        `src/lib/tenant/organizations.ts or fix DEFAULT_ORGANIZATION_SLUG for this deployment.`,
    );
    this.name = "UnknownOrganizationError";
  }
}

/**
 * Pure resolution, exported for tests and for the proxy (which runs on the edge
 * and needs the same answer without the `server-only` wrapper).
 *
 * **Throws on an unknown slug instead of falling back.** The fallback would be
 * `en`, and the only organization that exists today speaks `sr-Latn` — so a
 * typo'd or missing slug would silently flip the entire live site to English
 * with no error anywhere. A crash on an impossible configuration is strictly
 * better than a site that quietly serves the wrong language; the misconfigured
 * deployment is caught by the first request instead of by a customer.
 */
export function resolveDeploymentOrganization(
  slug: string,
): OrganizationContext {
  const settings = findOrganizationLocaleSettings(slug);
  if (settings === undefined) {
    throw new UnknownOrganizationError(slug);
  }
  return { slug, ...settings };
}

/** The organization this deployment serves. */
export async function getDeploymentOrganization(): Promise<OrganizationContext> {
  return resolveDeploymentOrganization(serverEnv.DEFAULT_ORGANIZATION_SLUG);
}
