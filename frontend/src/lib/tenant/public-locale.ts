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
 * # Why `default_content_locale` and not `ui_locale`
 *
 * The public site is overwhelmingly tenant-authored content, and its audience
 * is the tenant's clients — not the tenant's staff. The configuration this
 * matters for is real: an organization whose team works in English while it
 * publishes for Serbian clients sets `ui_locale = "en"` and
 * `default_content_locale = "sr-Latn"`. Rendering the public chrome from
 * `ui_locale` there would produce English buttons around Serbian articles, and
 * an `<html lang>` that contradicts the text underneath it.
 *
 * The whole public surface therefore renders in one language — the content's.
 * `ui_locale` governs the surfaces whose audience is the staff: the workspace,
 * the client panel, system validations, statuses, and system email.
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
    return (await getDeploymentOrganization()).defaultContentLocale;
  },
};

/** Convenience wrapper — the public surface's language. */
export async function resolvePublicLocale(): Promise<UiLocale> {
  return publicDeploymentLocaleResolver.resolve();
}
