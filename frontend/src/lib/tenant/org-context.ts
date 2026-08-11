import "server-only";

import { isUiLocale } from "@/i18n/locales";
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

/** Cache tag the settings mutation revalidates. One per organization. */
export function organizationLocaleTag(slug: string): string {
  return `organization:locales:${slug}`;
}

/**
 * The locales the backend holds, or `null` when it cannot be reached.
 *
 * A **tagged data-cache read**, not a request-time one. It is resolved during
 * static generation and stored in the data cache, so public pages stay
 * prerendered; changing the setting calls `revalidateTag` and the next render
 * picks it up without a redeploy. Nothing here touches `headers()` or
 * `cookies()`, which is what keeps `○` from turning into `ƒ`.
 *
 * Returning `null` rather than throwing is deliberate. The build prerenders
 * ~100 pages and would otherwise fail whenever the API is down — which already
 * happened once in this repo, on `/kompas/oblasti`. The checked-in registry
 * then answers, so a build never depends on this service being up.
 */
async function fetchOrganizationLocales(
  slug: string,
): Promise<Pick<
  OrganizationLocaleSettings,
  "uiLocale" | "defaultContentLocale"
> | null> {
  try {
    const response = await fetch(
      `${serverEnv.NEXT_PUBLIC_API_URL}/api/v1/public/organizations/${encodeURIComponent(slug)}/locales`,
      { next: { tags: [organizationLocaleTag(slug)], revalidate: 300 } },
    );
    if (!response.ok) return null;
    const body = (await response.json()) as {
      uiLocale?: unknown;
      defaultContentLocale?: unknown;
    };
    if (!isUiLocale(body.uiLocale) || !isUiLocale(body.defaultContentLocale)) {
      return null;
    }
    return {
      uiLocale: body.uiLocale,
      defaultContentLocale: body.defaultContentLocale,
    };
  } catch {
    return null;
  }
}

/**
 * The organization this deployment serves.
 *
 * The checked-in registry decides **which** organization and supplies its
 * timezone; the backend decides **what languages it currently speaks**, so a
 * change made in the settings screen takes effect without a code change. When
 * the backend is unreachable the registry answers alone — the deployment still
 * renders, in the language it was built with.
 */
export async function getDeploymentOrganization(): Promise<OrganizationContext> {
  const slug = serverEnv.DEFAULT_ORGANIZATION_SLUG;
  const registry = resolveDeploymentOrganization(slug);
  const live = await fetchOrganizationLocales(slug);
  return live === null ? registry : { ...registry, ...live };
}
