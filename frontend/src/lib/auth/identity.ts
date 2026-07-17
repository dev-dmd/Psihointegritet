/**
 * Provider-neutral identity contract.
 *
 * Domain and UI code depend on this shape, never on Clerk SDK types
 * (ARCHITECTURAL_RULES §10.1). The Clerk adapter in `lib/auth/clerk/` maps the
 * provider session onto `Identity`.
 *
 * Role model — deliberately NOT locked to a single enum value per user:
 * - membership roles (`client | therapist | org_admin`) are granted per
 *   organization and a user may hold several (e.g. `therapist` + `org_admin`);
 * - platform `superadmin` is a separate GLOBAL flag (`isSuperadmin`), not a
 *   membership role.
 *
 * This mirrors the backend baseline: `User`, `Organization`,
 * `OrganizationMembership` with `MembershipRole[]`, plus a global
 * `is_superadmin`. Authorization is owned by PostgreSQL and delivered by
 * `GET /api/v1/me` — never read from Clerk metadata (§10.3). Until that backend
 * lands, `isSuperadmin` is `false` and `memberships` is empty.
 */

/** Roles granted within an organization membership. A user may hold several. */
export type MembershipRole = "client" | "therapist" | "org_admin";

export const MEMBERSHIP_ROLE_LABELS: Record<MembershipRole, string> = {
  client: "Klijent",
  therapist: "Terapeut",
  org_admin: "Administrator organizacije",
};

export interface OrganizationMembership {
  organizationId: string;
  roles: MembershipRole[];
}

export interface Identity {
  /** Provider subject id (Clerk `userId`); maps to backend `users.external_auth_id`. */
  userId: string;
  /** Primary email when the provider exposes one. */
  email: string | null;
  /** Platform-wide superadmin — a global flag, independent of any org membership. */
  isSuperadmin: boolean;
  /** Organization memberships, each carrying one or more roles. */
  memberships: OrganizationMembership[];
}

export interface IdentityState {
  isLoaded: boolean;
  isSignedIn: boolean;
  identity: Identity | null;
}

/** True when the identity holds `role` in any organization membership. */
export function hasRole(identity: Identity, role: MembershipRole): boolean {
  return identity.memberships.some((membership) =>
    membership.roles.includes(role),
  );
}
