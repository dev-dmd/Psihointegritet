import type { Route } from "next";
import "server-only";

import { redirect } from "next/navigation";

import { hasRole, type Identity } from "@/lib/auth/identity";
import { getServerIdentity } from "@/lib/auth/identity-server";
import type { UiLocale } from "@/i18n/locales";
import { localizedPath } from "@/lib/routes/localized-path";
import { resolveWorkspaceLocale } from "@/lib/tenant/workspace-locale";
import { SIGN_IN_URL } from "@/lib/auth/routes";

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
 * Role capabilities inside the Control Center. Superadmins viewing the tenant
 * panel are treated as holding both roles (full access). These drive both the
 * per-page guards below and the role-derived navigation in the workspace shell
 * — the guard is the authority, the nav only mirrors it.
 */
export function isWorkspaceAdmin(identity: Identity): boolean {
  return identity.isSuperadmin || hasRole(identity, "org_admin");
}

export function isWorkspaceTherapist(identity: Identity): boolean {
  return identity.isSuperadmin || hasRole(identity, "therapist");
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
/**
 * `locale` is required, deliberately without a default.
 *
 * A default would be `PLATFORM_DEFAULT_LOCALE` (`en`), and the only
 * organization that exists today is Serbian — so a caller that forgot to pass
 * one would silently redirect a live user to `/workspace`, which does not
 * resolve. A missing argument must be a compile error, not a 404.
 */
export function resolveLandingRoute(
  identity: Identity,
  locale: UiLocale,
): Route {
  if (identity.isSuperadmin) {
    return localizedPath("superadmin.home", { locale });
  }
  if (isStaff(identity)) {
    return localizedPath("workspace.home", { locale });
  }
  return localizedPath("account.home", { locale });
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
    redirect(resolveLandingRoute(identity, await resolveWorkspaceLocale()));
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
    redirect(
      localizedPath("account.home", { locale: await resolveWorkspaceLocale() }),
    );
  }
  return identity;
}

/**
 * Control Center admin-only pages (Kompanije, Usluge i cene, Istraživanja,
 * Terapeuti, Podešavanja). A therapist without the admin role is sent back to
 * the workspace home; a client to their account. Superadmins pass.
 */
export async function requireOrgAdmin(): Promise<Identity> {
  const identity = await getServerIdentity();
  if (!identity) {
    redirect(SIGN_IN_URL as Route);
  }
  if (!isWorkspaceAdmin(identity)) {
    redirect(resolveLandingRoute(identity, await resolveWorkspaceLocale()));
  }
  return identity;
}

/**
 * Control Center therapist-only pages (Moj profil). A pure org_admin who is
 * not a therapist has no personal profile and is sent back to the workspace
 * home; a client to their account. Superadmins pass.
 */
export async function requireTherapist(): Promise<Identity> {
  const identity = await getServerIdentity();
  if (!identity) {
    redirect(SIGN_IN_URL as Route);
  }
  if (!isWorkspaceTherapist(identity)) {
    redirect(resolveLandingRoute(identity, await resolveWorkspaceLocale()));
  }
  return identity;
}

/**
 * Client panel pages. Anyone signed in who is not staff belongs here —
 * including an account with no membership row yet, which is what a fresh
 * sign-up looks like until the backend identity slice lands.
 *
 * Staff and superadmins are bounced to their own area rather than shown a
 * client dashboard: `resolveLandingRoute` already knows where each role lives,
 * and this is the same bounce `account/page.tsx` performed inline before the
 * panel had four screens to guard.
 */
export async function requireClient(): Promise<Identity> {
  const identity = await getServerIdentity();
  if (!identity) {
    redirect(SIGN_IN_URL as Route);
  }
  if (identity.isSuperadmin || isStaff(identity)) {
    redirect(resolveLandingRoute(identity, await resolveWorkspaceLocale()));
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
