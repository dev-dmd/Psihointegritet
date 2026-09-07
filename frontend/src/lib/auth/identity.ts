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
  /**
   * The organization's stable public slug — `"psihointegritet"`, not a UUID.
   *
   * Named `organizationId` until B2-1 while carrying a slug. The backend chose
   * the slug deliberately (UUIDs differ per environment, so nothing on this
   * side could compare against one); only the name was wrong, and a field whose
   * name contradicts its contents is how a guard ends up comparing the wrong
   * two values.
   */
  organizationSlug: string;
  roles: MembershipRole[];
}

export interface Identity {
  /** Provider subject id (Clerk `userId`); maps to backend `users.external_auth_id`. */
  userId: string;
  /** Primary email when the provider exposes one. */
  email: string | null;
  /**
   * How to address this person in the UI, or `null` when the provider holds no
   * name yet.
   *
   * Null is a real state, not a defect: someone can sign in with an email
   * before filling in a profile. Callers fall back to the email and then to a
   * generic label — which is what the sidebar showed for everyone until this
   * field existed, so a staff member saw "Član tima" instead of their own name.
   */
  displayName: string | null;
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

/**
 * True when the identity holds `role` **in this organization**.
 *
 * The organization is required and has no default, deliberately. This function
 * used to answer "in any membership", which was invisible while one deployment
 * only ever served one organization — and became a cross-tenant authorization
 * bug the moment one runtime could serve two: an `org_admin` at one tenant
 * would pass an `org_admin` guard on another tenant's domain.
 *
 * There is no global variant and no optional parameter. A default would let a
 * call site opt back into the old behaviour by omission, which is exactly how
 * the bug would return — silently, and only in the tenant it hurts.
 */
export function hasRole(
  identity: Identity,
  organizationSlug: string,
  role: MembershipRole,
): boolean {
  return identity.memberships.some(
    (membership) =>
      membership.organizationSlug === organizationSlug &&
      membership.roles.includes(role),
  );
}
