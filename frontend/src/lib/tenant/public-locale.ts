import "server-only";

import type { UiLocale } from "@/i18n/locales";
import { getDeploymentOrganization } from "@/lib/tenant/org-context";

/**
 * Locale for the **public** surface — marketing pages, CMS content, Kompas
 * taxonomy pages, the booking shell and the intake shell.
 *
 * # The rendering contract this exists to protect
 *
 * These routes are SSG or ISR (`/`, `/tim`, `/usluge/[slug]`, `/radionice/…`
 * all prerender with a 5m revalidate). Next.js treats `headers()` and
 * `cookies()` as request-time APIs: calling either anywhere in a route's render
 * tree opts that route out of static rendering. Because `i18n/request.ts` runs
 * inside every translated render, a single `headers()` call there would convert
 * the entire public site to per-request SSR.
 *
 * So this resolver reads **no request state at all** — only `process.env` and a
 * checked-in table, both of which are known without an incoming request.
 *
 * Allowed sources: deployment organization config · build-time env · a cached
 * organization config under a statically known organization id · a static/ISR
 * route param · an explicit locale argument to a server formatter.
 *
 * Forbidden, and enforced by `scripts/check-frontend-architecture.mjs`:
 * `Host` header · any `X-Organization-*` header · a browser cookie as tenant
 * identity · `Accept-Language` as the authority for organization locale.
 *
 * # Why `ui_locale`
 *
 * D-077 A5 makes this the only organization-scoped render locale. It governs
 * public platform chrome and fallback content as well as authenticated
 * surfaces, messages, email and errors. Tenant-authored CMS fields remain
 * exactly as entered and may therefore be mixed by author choice.
 * `default_content_locale` is read only when a new CMS entry is created; it is
 * never a render selector.
 *
 * # Tier 2 seam
 *
 * If host-shared multi-tenancy is ever approved (ADR-023 §6.3 + RLS, its own
 * milestone), it does NOT arrive by adding `headers()` here — that would take
 * the public site down to SSR. It arrives as model B2: a proxy rewrite to an
 * internal tenant-scoped pathname, so each tenant keeps its own static/ISR
 * output. This interface is the named seam; nothing behind it is built.
 */
export interface PublicDeploymentLocaleResolver {
  resolve(): Promise<UiLocale>;
}

export const publicDeploymentLocaleResolver: PublicDeploymentLocaleResolver = {
  async resolve(): Promise<UiLocale> {
    return (await getDeploymentOrganization()).uiLocale;
  },
};

/** Convenience wrapper — the public surface's language. */
export async function resolvePublicLocale(): Promise<UiLocale> {
  return publicDeploymentLocaleResolver.resolve();
}
