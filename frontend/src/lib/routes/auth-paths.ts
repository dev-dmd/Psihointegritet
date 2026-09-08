/**
 * The two paths that let somebody reach any surface at all.
 *
 * They live in their own module, with **no imports**, because both sides of the
 * routing layer need them: `lib/auth/routes.ts` exports them as the auth
 * configuration, and `lib/routes/match.ts` has to recognise them when deciding
 * which host may serve which surface. Importing one from the other would close
 * a cycle around two modules that both do work at import time.
 *
 * Not localized, deliberately (D-077 Amendment §10): Clerk holds these values
 * in its own configuration, and a callback contract that shifts with the
 * tenant's language is a support incident waiting to happen. The pages behind
 * them are still translated — it is the *path* that stays stable.
 */
export const SIGN_IN_PATH = "/prijava";
export const SIGN_UP_PATH = "/registracija";

/**
 * Where a reset or activation link lands.
 *
 * Beside the other two and for the same reason: the link is generated on a
 * server, mailed, and opened days later, so the path it names must not shift
 * with anybody's language. It carries the one-time token in the query string
 * and is `noindex`.
 */
export const RESET_PASSWORD_PATH = "/nova-lozinka";

/**
 * Where a signed-in person lands when no surface will have them.
 *
 * An auth *outcome*, so it belongs with the auth paths rather than with either
 * surface: the platform sends a client here when their memberships name no
 * single practice, and a tenant host sends one here for the same reason. Both
 * need it to answer.
 */
export const ACCESS_DENIED_PATH = "/pristup-odbijen";

/** Where Clerk sends someone once signed in; the destination is decided there. */
export const POST_AUTH_LANDING_PATH = "/api/auth/landing";

/** Where the browser posts to end a session; clears the cookie and redirects. */
export const SIGN_OUT_PATH = "/api/auth/sign-out";
