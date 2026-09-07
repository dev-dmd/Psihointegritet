import { beforeEach, describe, expect, it, vi } from "vitest";

import { hasRole, type Identity } from "@/lib/auth/identity";

const { getServerIdentityMock, redirectMock } = vi.hoisted(() => ({
  getServerIdentityMock: vi.fn(),
  redirectMock: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  }),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/auth/identity-server", () => ({
  getServerIdentity: getServerIdentityMock,
}));
vi.mock("next/navigation", () => ({ redirect: redirectMock }));
// The workspace resolver reaches `serverEnv`, which throws without a real
// environment. These guards are about *who* is redirected where, not about
// which language the target is in, so the locale is pinned to the live tenant.
vi.mock("@/lib/tenant/workspace-locale", () => ({
  resolveWorkspaceLocale: () => Promise.resolve("sr-Latn"),
}));
// Which tenant the request is acting in. Pinned here so these tests are about
// authorization rather than about where the slug comes from — under B2 it will
// come from the route param instead, and only this mock changes.
vi.mock("@/lib/tenant/active-organization", () => ({
  getActiveOrganizationSlug: () => Promise.resolve(ACTIVE_TENANT),
}));
const ACTIVE_TENANT = "psihointegritet";
const OTHER_TENANT = "sanja-neuer";

import {
  isStaff,
  isWorkspaceAdmin,
  isWorkspaceTherapist,
  requireOrgAdmin,
  requireClient,
  requireStaff,
  requireSuperadmin,
  requireSuperadminApi,
  requireTherapist,
  resolveLandingRoute,
} from "./guards";

function identity(partial: Partial<Identity>): Identity {
  return {
    userId: "user_1",
    email: "test@test.rs",
    displayName: null,
    isSuperadmin: false,
    memberships: [],
    ...partial,
  };
}

const superadmin = identity({ isSuperadmin: true });
const staff = identity({
  memberships: [
    { organizationSlug: ACTIVE_TENANT, roles: ["org_admin", "therapist"] },
  ],
});
const client = identity({
  memberships: [{ organizationSlug: ACTIVE_TENANT, roles: ["client"] }],
});
const noRoles = identity({});
const adminOnly = identity({
  memberships: [{ organizationSlug: ACTIVE_TENANT, roles: ["org_admin"] }],
});
const therapistOnly = identity({
  memberships: [{ organizationSlug: ACTIVE_TENANT, roles: ["therapist"] }],
});

describe("requireSuperadmin", () => {
  beforeEach(() => {
    getServerIdentityMock.mockReset();
    redirectMock.mockClear();
  });

  it("redirects unauthenticated visitors to sign-in", async () => {
    getServerIdentityMock.mockResolvedValue(null);
    await expect(requireSuperadmin()).rejects.toThrow("REDIRECT:/prijava");
  });

  it("redirects staff to the workspace", async () => {
    getServerIdentityMock.mockResolvedValue(staff);
    await expect(requireSuperadmin()).rejects.toThrow(
      "REDIRECT:/radni-prostor",
    );
  });

  it("redirects clients and role-less users to the account area", async () => {
    for (const who of [client, noRoles]) {
      getServerIdentityMock.mockResolvedValue(who);
      await expect(requireSuperadmin()).rejects.toThrow("REDIRECT:/nalog");
    }
  });

  it("returns the identity for a superadmin", async () => {
    getServerIdentityMock.mockResolvedValue(superadmin);
    expect(await requireSuperadmin()).toEqual(superadmin);
    expect(redirectMock).not.toHaveBeenCalled();
  });
});

describe("requireStaff", () => {
  beforeEach(() => {
    getServerIdentityMock.mockReset();
    redirectMock.mockClear();
  });

  it("redirects unauthenticated visitors to sign-in", async () => {
    getServerIdentityMock.mockResolvedValue(null);
    await expect(requireStaff()).rejects.toThrow("REDIRECT:/prijava");
  });

  it("lets staff and superadmins through", async () => {
    for (const who of [staff, superadmin]) {
      getServerIdentityMock.mockResolvedValue(who);
      expect(await requireStaff()).toEqual(who);
    }
  });

  it("redirects clients to the account area", async () => {
    getServerIdentityMock.mockResolvedValue(client);
    await expect(requireStaff()).rejects.toThrow("REDIRECT:/nalog");
  });
});

describe("requireSuperadminApi", () => {
  beforeEach(() => {
    getServerIdentityMock.mockReset();
  });

  it("returns null for anyone who is not a superadmin", async () => {
    for (const who of [null, staff, client]) {
      getServerIdentityMock.mockResolvedValue(who);
      expect(await requireSuperadminApi()).toBeNull();
    }
  });

  it("returns the identity for a superadmin", async () => {
    getServerIdentityMock.mockResolvedValue(superadmin);
    expect(await requireSuperadminApi()).toEqual(superadmin);
  });
});

describe("resolveLandingRoute", () => {
  it("sends superadmins to /superadmin regardless of any staff roles", () => {
    const superadminAndStaff = identity({
      isSuperadmin: true,
      memberships: [{ organizationSlug: ACTIVE_TENANT, roles: ["org_admin"] }],
    });
    expect(
      resolveLandingRoute(superadminAndStaff, ACTIVE_TENANT, "sr-Latn"),
    ).toBe("/superadmin");
  });

  it("sends every staff role combination to /radni-prostor", () => {
    for (const who of [adminOnly, therapistOnly, staff]) {
      expect(resolveLandingRoute(who, ACTIVE_TENANT, "sr-Latn")).toBe(
        "/radni-prostor",
      );
    }
  });

  it("sends clients and role-less users to /nalog", () => {
    for (const who of [client, noRoles]) {
      expect(resolveLandingRoute(who, ACTIVE_TENANT, "sr-Latn")).toBe("/nalog");
    }
  });
});

describe("workspace role capabilities", () => {
  it("treats org_admin and superadmin as workspace admins", () => {
    for (const who of [adminOnly, staff, superadmin]) {
      expect(isWorkspaceAdmin(who, ACTIVE_TENANT)).toBe(true);
    }
    for (const who of [therapistOnly, client, noRoles]) {
      expect(isWorkspaceAdmin(who, ACTIVE_TENANT)).toBe(false);
    }
  });

  it("treats therapist and superadmin as workspace therapists", () => {
    for (const who of [therapistOnly, staff, superadmin]) {
      expect(isWorkspaceTherapist(who, ACTIVE_TENANT)).toBe(true);
    }
    for (const who of [adminOnly, client, noRoles]) {
      expect(isWorkspaceTherapist(who, ACTIVE_TENANT)).toBe(false);
    }
  });
});

describe("requireOrgAdmin", () => {
  beforeEach(() => {
    getServerIdentityMock.mockReset();
    redirectMock.mockClear();
  });

  it("redirects unauthenticated visitors to sign-in", async () => {
    getServerIdentityMock.mockResolvedValue(null);
    await expect(requireOrgAdmin()).rejects.toThrow("REDIRECT:/prijava");
  });

  it("lets org_admins and superadmins through", async () => {
    for (const who of [adminOnly, staff, superadmin]) {
      getServerIdentityMock.mockResolvedValue(who);
      expect(await requireOrgAdmin()).toEqual(who);
    }
  });

  it("sends a therapist-only user back to the workspace", async () => {
    getServerIdentityMock.mockResolvedValue(therapistOnly);
    await expect(requireOrgAdmin()).rejects.toThrow("REDIRECT:/radni-prostor");
  });

  it("sends a client to the account area", async () => {
    getServerIdentityMock.mockResolvedValue(client);
    await expect(requireOrgAdmin()).rejects.toThrow("REDIRECT:/nalog");
  });
});

describe("requireTherapist", () => {
  beforeEach(() => {
    getServerIdentityMock.mockReset();
    redirectMock.mockClear();
  });

  it("lets therapists and superadmins through", async () => {
    for (const who of [therapistOnly, staff, superadmin]) {
      getServerIdentityMock.mockResolvedValue(who);
      expect(await requireTherapist()).toEqual(who);
    }
  });

  it("sends an admin-only user back to the workspace", async () => {
    getServerIdentityMock.mockResolvedValue(adminOnly);
    await expect(requireTherapist()).rejects.toThrow("REDIRECT:/radni-prostor");
  });

  it("sends a client to the account area", async () => {
    getServerIdentityMock.mockResolvedValue(client);
    await expect(requireTherapist()).rejects.toThrow("REDIRECT:/nalog");
  });
});

/**
 * The reason B2-1 exists. Everything above tests one tenant; these test that a
 * role held at one tenant grants nothing at another.
 *
 * The bug this closes was invisible under C2(a) — a deployment only ever saw
 * one organization, so "has this role anywhere" and "has this role here" were
 * the same sentence. Under a shared runtime they stop being the same sentence,
 * and the difference is an admin of one practice administering another.
 */
describe("cross-tenant isolation", () => {
  beforeEach(() => {
    getServerIdentityMock.mockReset();
    redirectMock.mockClear();
  });

  /** Owner of Psihointegritet, ordinary client at Sanja's. */
  const adminHereClientThere = identity({
    memberships: [
      { organizationSlug: ACTIVE_TENANT, roles: ["org_admin"] },
      { organizationSlug: OTHER_TENANT, roles: ["client"] },
    ],
  });

  /** Therapist at Psihointegritet, nothing at all at Sanja's. */
  const therapistHereNothingThere = identity({
    memberships: [{ organizationSlug: ACTIVE_TENANT, roles: ["therapist"] }],
  });

  it("grants a role only in the organization that granted it", () => {
    expect(hasRole(adminHereClientThere, ACTIVE_TENANT, "org_admin")).toBe(
      true,
    );
    expect(hasRole(adminHereClientThere, OTHER_TENANT, "org_admin")).toBe(
      false,
    );
    expect(hasRole(adminHereClientThere, OTHER_TENANT, "client")).toBe(true);
  });

  it("treats staff of another tenant as not staff here", () => {
    expect(isStaff(adminHereClientThere, ACTIVE_TENANT)).toBe(true);
    expect(isStaff(adminHereClientThere, OTHER_TENANT)).toBe(false);
    expect(isStaff(therapistHereNothingThere, OTHER_TENANT)).toBe(false);
  });

  it("scopes the workspace capabilities to the active organization", () => {
    expect(isWorkspaceAdmin(adminHereClientThere, ACTIVE_TENANT)).toBe(true);
    expect(isWorkspaceAdmin(adminHereClientThere, OTHER_TENANT)).toBe(false);

    expect(isWorkspaceTherapist(therapistHereNothingThere, ACTIVE_TENANT)).toBe(
      true,
    );
    expect(isWorkspaceTherapist(therapistHereNothingThere, OTHER_TENANT)).toBe(
      false,
    );
  });

  it("lands the same person differently on each tenant", () => {
    // One identity, two destinations. This is the whole point: an owner at one
    // practice is a client at another and must not arrive in a workspace there.
    expect(
      resolveLandingRoute(adminHereClientThere, ACTIVE_TENANT, "sr-Latn"),
    ).toBe("/radni-prostor");
    expect(
      resolveLandingRoute(adminHereClientThere, OTHER_TENANT, "sr-Latn"),
    ).toBe("/nalog");
  });

  it("admits an admin of this tenant to the admin guard", async () => {
    getServerIdentityMock.mockResolvedValue(adminHereClientThere);
    await expect(requireOrgAdmin()).resolves.toBe(adminHereClientThere);
  });

  it("keeps a client of this tenant on the client panel", async () => {
    // Staff *elsewhere* must not be bounced out of their own account page here.
    const clientHereAdminThere = identity({
      memberships: [
        { organizationSlug: ACTIVE_TENANT, roles: ["client"] },
        { organizationSlug: OTHER_TENANT, roles: ["org_admin", "therapist"] },
      ],
    });
    getServerIdentityMock.mockResolvedValue(clientHereAdminThere);
    await expect(requireClient()).resolves.toBe(clientHereAdminThere);
  });

  it("refuses staff surfaces to someone whose only roles are elsewhere", async () => {
    const staffOnlyElsewhere = identity({
      memberships: [
        { organizationSlug: OTHER_TENANT, roles: ["org_admin", "therapist"] },
      ],
    });
    getServerIdentityMock.mockResolvedValue(staffOnlyElsewhere);
    await expect(requireStaff()).rejects.toThrow("REDIRECT:/nalog");

    getServerIdentityMock.mockResolvedValue(staffOnlyElsewhere);
    await expect(requireOrgAdmin()).rejects.toThrow("REDIRECT:/nalog");

    getServerIdentityMock.mockResolvedValue(staffOnlyElsewhere);
    await expect(requireTherapist()).rejects.toThrow("REDIRECT:/nalog");
  });

  it("gives no capability to an account with no membership at all", () => {
    expect(isStaff(noRoles, ACTIVE_TENANT)).toBe(false);
    expect(isWorkspaceAdmin(noRoles, ACTIVE_TENANT)).toBe(false);
    expect(isWorkspaceTherapist(noRoles, ACTIVE_TENANT)).toBe(false);
    expect(hasRole(noRoles, ACTIVE_TENANT, "client")).toBe(false);
  });

  it("keeps the superadmin flag global, in every tenant", () => {
    // D-051: the platform operator acts inside any tenant with the full staff
    // capability set, membership rows or not. That is deliberate and survives.
    expect(isWorkspaceAdmin(superadmin, OTHER_TENANT)).toBe(true);
    expect(isWorkspaceTherapist(superadmin, OTHER_TENANT)).toBe(true);
    // But the flag is not a membership: it grants capability, not a role.
    expect(hasRole(superadmin, OTHER_TENANT, "org_admin")).toBe(false);
  });
});
