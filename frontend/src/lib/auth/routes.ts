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

/** URL prefixes that require an authenticated session. */
export const PROTECTED_ROUTE_PREFIXES = [
  "/nalog", // (client) — client account area
  "/radni-prostor", // (staff) — therapist / org-admin workspace
  "/superadmin", // (staff) — platform superadmin
] as const;
