import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

import { resolveDeploymentSlug } from "./src/lib/tenant/deployment-slug";

const nextConfig: NextConfig = {
  /**
   * Inlined into the client bundle at build time.
   *
   * `content/locale.ts` reads this to choose the fallback locale, and it is
   * imported by Client Components. `process.env` in the browser is a shim that
   * holds `NEXT_PUBLIC_*` and nothing else, so without this entry the read
   * returned `undefined` there and every Client Component fell back to
   * "psihointegritet" — Serbian content hydrating over an English server
   * render. Listing it here is what makes the two agree.
   *
   * Build-time inlining is the right shape for it: under C2(a) one deployment
   * serves one organization, so the slug cannot change while the server runs.
   */
  env: {
    // Throws on a deployed build with no tenant named, which makes `next build`
    // the earliest and loudest place that mistake can surface — better than a
    // running site quietly serving the founding tenant's content.
    DEFAULT_ORGANIZATION_SLUG: resolveDeploymentSlug(
      process.env.DEFAULT_ORGANIZATION_SLUG,
      process.env.DEPLOYMENT_ENV,
    ),
  },
  reactCompiler: true,
  poweredByHeader: false,
  typedRoutes: true,
};

/**
 * next-intl is wired as a message/format layer only — no locale routing, no
 * `app/[locale]` segment, no `localePrefix`. See `src/i18n/request.ts`.
 *
 * `cacheComponents` (which absorbed Partial Prerendering) is deliberately NOT
 * enabled: it is not a project decision, and nothing in the i18n work needs it.
 * The public site stays statically rendered because `i18n/request.ts` reads no
 * request-time API, not because of a rendering flag.
 */
const withNextIntl = createNextIntlPlugin({
  requestConfig: "./src/i18n/request.ts",
});

export default withNextIntl(nextConfig);
