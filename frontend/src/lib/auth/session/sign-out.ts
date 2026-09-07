"use client";

/**
 * End the current session and return the person to the site they were on.
 *
 * Host-relative on purpose: a client signing out on their practitioner's domain
 * lands on that practitioner's home page, and an owner signing out on the
 * platform lands on the platform's. One implementation, correct on both,
 * because it never names a host.
 *
 * Today there is no session to end (D-083), so this only navigates. The auth
 * engine adds the `POST /api/v1/auth/logout` call that revokes the row in
 * `auth_sessions` and clears the cookie — the navigation stays as it is.
 */
export async function signOut(redirectUrl = "/"): Promise<void> {
  // Nothing to revoke yet. Kept async so callers already await it and the
  // engine can add the request without touching a single call site.
  window.location.assign(redirectUrl);
}
