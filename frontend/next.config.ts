import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const nextConfig: NextConfig = {
  reactCompiler: true,
  poweredByHeader: false,
  typedRoutes: true,
  images: {
    remotePatterns: [{ protocol: "https", hostname: "img.clerk.com" }],
  },
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
