import "server-only";

/**
 * The server's answer to "who is making this request, and what may I send to the
 * backend on their behalf".
 *
 * # Why this module exists before it does anything
 *
 * Clerk is being removed (D-083) and the PDC auth engine is a later slice, so
 * right now the honest answer to both questions is "nobody". That is a real
 * state, not a stub: the platform has no sign-in until the engine lands, and
 * every caller has to behave correctly while that is true.
 *
 * Naming it now means the engine fills a seam instead of threading a new
 * concept through five call sites later. The five places that used to each
 * write `const session = await auth(); const token = await session.getToken();`
 * — `lib/auth/session/server-identity.ts`, the booking, intake and superadmin
 * backend proxies, and the staff content preview — all ask here instead.
 *
 * # What the auth engine replaces
 *
 * `getServerToken()` reads the session cookie, looks the session up in
 * `auth_sessions`, and returns a value the backend can verify. Nothing else in
 * the codebase changes shape when it does, which is the point of writing it
 * this way round.
 */

/**
 * The bearer token for the current request, or `null` when nobody is signed in.
 *
 * `null` is not an error. Callers must treat it as "this request is anonymous"
 * and answer accordingly — a public endpoint proceeds, a staff endpoint refuses.
 */
export async function getServerToken(): Promise<string | null> {
  // No session store yet. Deliberately not throwing: an anonymous request is
  // the normal case on every public page, and throwing here would take the
  // public site down with the auth provider.
  return null;
}

/** Whether the current request carries a session at all. */
export async function hasServerSession(): Promise<boolean> {
  return (await getServerToken()) !== null;
}
