/**
 * The two session cookies, named once.
 *
 * **No imports, deliberately** — the same discipline as `lib/routes/auth-paths.ts`.
 * The proxy runtime and the server seam will both need these names, and neither
 * may drag the other's imports in: the proxy has no `next/headers`, and the
 * server seam is `server-only`.
 *
 * Two names rather than one is the whole point (D-083). A platform owner's
 * session and a tenant client's session are different kinds of thing, and the
 * guard that accepts one must be unable to accidentally accept the other.
 * Marysoll shipped a single `tenant-*` pair shared by clients and tenant admins
 * and documented the collision it caused; this is that mistake, not made.
 *
 * Both are host-only in production — no `domain` attribute — so a session on
 * one tenant's domain is never even *sent* to another's.
 */
export const PLATFORM_SESSION_COOKIE = "pdc_platform_session";
export const TENANT_SESSION_COOKIE = "pdc_tenant_session";
