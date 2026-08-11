import { getRequestConfig } from "next-intl/server";

import { resolvePublicLocale } from "@/lib/tenant/public-locale";
import { getDeploymentOrganization } from "@/lib/tenant/org-context";
import { getPlatformMessages } from "@/messages";

/**
 * next-intl request configuration (I18N-2).
 *
 * # next-intl is a message and format layer here, nothing more
 *
 * Its routing layer (`defineRouting`, its middleware, `createNavigation`) is
 * **not used**. Verified against the installed 4.13.2: those always resolve to
 * an internal path containing the locale and expect an `app/[locale]` segment
 * even with `localePrefix: "never"`, and they detect locale from a cookie or
 * `Accept-Language`. Both are forbidden — locale follows the organization, not
 * the URL and not the browser. Route localization is ours, in `lib/routes/`.
 *
 * Do not "fix" this by adopting `pathnames`.
 *
 * # This function must not read request state
 *
 * It runs inside every translated render, including the root layout, so a
 * single `headers()` or `cookies()` call here would opt the entire public site
 * out of static rendering — 100 prerendered pages becoming per-request SSR with
 * no error to notice. `resolvePublicLocale()` reads `process.env` and a
 * checked-in table; `scripts/check-frontend-architecture.mjs` fails the build
 * if that ever stops being true.
 *
 * # Why the public locale, in a config the workspace also uses
 *
 * The shared root layout serves both surfaces, so there is exactly one default
 * here, and it must be the one that is safe to compute statically. Under the
 * rendering contract that is the public surface's `default_content_locale`.
 *
 * Authenticated surfaces take `ui_locale` explicitly when the two differ:
 * next-intl 4.x accepts `getTranslations({ locale })` and
 * `getFormatter({ locale })`, so a workspace subtree overrides the default
 * without dragging the public tree into request-time rendering. Today the only
 * organization has both values equal, so nothing overrides anything yet — but
 * the seam is here and named rather than discovered later under pressure.
 */
export default getRequestConfig(async () => {
  // `requestLocale` is deliberately ignored. Its own docstring names this exact
  // case: the value is `undefined` when a page outside a `[locale]` segment
  // renders, and there is no `[locale]` segment anywhere in this app.
  const organization = await getDeploymentOrganization();
  const locale = await resolvePublicLocale();

  return {
    locale,
    messages: getPlatformMessages(locale),
    /**
     * Explicit, and load-bearing. The server container runs UTC while the
     * browser runs the organization's zone; without pinning it here the two
     * format the same instant into different days around midnight, which
     * surfaces as a hydration mismatch nobody can reproduce at 14:00.
     */
    timeZone: organization.timeZone,
  };
});
