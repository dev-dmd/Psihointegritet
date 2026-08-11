import { protectedRoutePrefixes } from "@/lib/routes/match";

/**
 * Auth route configuration, provider-neutral.
 *
 * `proxy.ts` uses `PROTECTED_ROUTE_PATTERNS` as a coarse authentication gate:
 * it only redirects unauthenticated visitors to sign-in. Real authorization
 * (which role may see what) is enforced by the backend per use case — the proxy
 * is never the final authorization layer (v0.3 §5.4).
 */

export const SIGN_IN_URL = "/prijava";
export const SIGN_UP_URL = "/registracija";

/** Where to land after a successful sign-in / sign-up. */
export const AFTER_AUTH_URL = "/nalog";

/**
 * Client account area, used by the header avatar dropdown and mobile drawer.
 * `/nalog` is the client dashboard (Serbian for "account"); the sub-areas are
 * skeleton targets that fill in as the booking/settings slices land.
 */
export const ACCOUNT_URL = "/nalog";
export const ACCOUNT_APPOINTMENTS_URL = "/nalog/termini";
export const ACCOUNT_SETTINGS_URL = "/nalog/podesavanja";

/**
 * The client-area constants above stay literals on purpose: they are handed to
 * Clerk as fallback redirect targets, which must be stable strings resolvable
 * without a locale. Everything that renders a link inside the app goes through
 * `localizedPath` instead. When the client panel is localized (ROUTE-I18N-3),
 * these become the `sr-Latn` fallback and nothing else changes.
 */

/**
 * URL prefixes that require an authenticated session.
 *
 * **Derived from the route registry, never hand-listed** (D-077 Amendment).
 * The proxy matches the *external* path, so once a route has one path per
 * locale a hand-written list is how a locale gets added and its auth gate
 * forgotten — which is an unauthenticated Control Center, not a cosmetic bug.
 * `platform-routes.test.ts` asserts that every locale path of every
 * `protected: true` route is covered by some prefix here.
 */
export const PROTECTED_ROUTE_PREFIXES: readonly string[] =
  protectedRoutePrefixes();
