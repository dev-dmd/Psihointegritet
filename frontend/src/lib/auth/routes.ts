import { protectedRoutePrefixes } from "@/lib/routes/match";

/**
 * Auth route configuration, provider-neutral.
 *
 * `proxy.ts` uses `PROTECTED_ROUTE_PREFIXES` as a coarse authentication gate:
 * it only redirects unauthenticated visitors to sign-in. Real authorization
 * (which role may see what) is enforced by the backend per use case — the proxy
 * is never the final authorization layer (v0.3 §5.4).
 *
 * What used to live here — `ACCOUNT_URL`, `ACCOUNT_APPOINTMENTS_URL`,
 * `ACCOUNT_SETTINGS_URL`, `WORKSPACE_URL`, `SUPERADMIN_URL`, `AFTER_AUTH_URL` —
 * moved into the route registry (`lib/routes/`). A module-level constant cannot
 * know the organization's language, so it can only ever name one locale's path.
 */

/**
 * Sign-in and sign-up stay literals, deliberately.
 *
 * Auth, OAuth callback and verification routes are **not localized** (D-077
 * Amendment §10): Clerk holds these values in its own configuration, and a
 * callback contract that shifts with the tenant's language is a support
 * incident waiting to happen. The pages behind them are still translated — it
 * is the *path* that stays stable, not the copy.
 */
export const SIGN_IN_URL = "/prijava";
export const SIGN_UP_URL = "/registracija";

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
