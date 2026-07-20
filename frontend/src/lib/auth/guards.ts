import "server-only";

import type { Route } from "next";
import { redirect } from "next/navigation";

import { hasRole, type Identity } from "@/lib/auth/identity";
import { getServerIdentity } from "@/lib/auth/identity-server";
import {
  ACCOUNT_URL,
  SIGN_IN_URL,
  SUPERADMIN_URL,
  WORKSPACE_URL,
} from "@/lib/auth/routes";

/**
 * Server-side role guards. Every protected page calls its guard directly —
 * layout checks alone are not enough because layouts do not re-run on soft
 * navigation, and nav hiding is never authorization (rules §11, D-026).
 *
 * `redirect()` throws — never call these inside try/catch.
 */

function isStaff(identity: Identity): boolean {
  return hasRole(identity, "org_admin") || hasRole(identity, "therapist");
}

/**
 * Where a signed-in user belongs right after authentication. Clerk's
 * `signInFallbackRedirectUrl` is a single static string ("/nalog") — it has
 * no idea about roles. This resolves the real destination for every role
 * combination the app currently models:
 *
 * - superadmin → /superadmin (global flag, independent of any membership);
 * - org_admin and/or therapist, in any combination → /radni-prostor. The app
 *   has one staff workspace, not a route per role combo — inside it, the
 *   future Control Center shows/hides sections per held role (design handoff
 *   §7 "Vlasnik/Terapeut" pill), the same way `org_admin` there stands for
 *   what the handoff calls "vlasnik" (owner). A therapist's own client list
 *   is a page inside that workspace, not a separate top-level destination.
 * - client, or no role yet → /nalog.
 *
 * Multi-tenant routing (a distinct landing per tenant) is out of scope until
 * more than one tenant exists — today everything resolves within the single
 * hardcoded Psihointegritet tenant.
 */
export function resolveLandingRoute(identity: Identity): Route {
  if (identity.isSuperadmin) {
    return SUPERADMIN_URL as Route;
  }
  if (isStaff(identity)) {
    return WORKSPACE_URL as Route;
  }
  return ACCOUNT_URL as Route;
}

/**
 * Allows only platform superadmins. Everyone else is sent to the area they
 * belong to: staff → workspace, any other signed-in user → client account.
 */
export async function requireSuperadmin(): Promise<Identity> {
  const identity = await getServerIdentity();
  if (!identity) {
    redirect(SIGN_IN_URL as Route); // proxy already covers this; defense in depth
  }
  if (!identity.isSuperadmin) {
    redirect((isStaff(identity) ? WORKSPACE_URL : ACCOUNT_URL) as Route);
  }
  return identity;
}

/**
 * Allows staff (org_admin/therapist) and superadmins; clients go to /nalog.
 */
export async function requireStaff(): Promise<Identity> {
  const identity = await getServerIdentity();
  if (!identity) {
    redirect(SIGN_IN_URL as Route);
  }
  if (!identity.isSuperadmin && !isStaff(identity)) {
    redirect(ACCOUNT_URL as Route);
  }
  return identity;
}

/**
 * Guard for future /superadmin route handlers: returns the identity, or null
 * when the caller must respond 404 — the route stays invisible to
 * non-superadmins instead of advertising itself with a 403.
 */
export async function requireSuperadminApi(): Promise<Identity | null> {
  const identity = await getServerIdentity();
  if (!identity?.isSuperadmin) {
    return null;
  }
  return identity;
}
