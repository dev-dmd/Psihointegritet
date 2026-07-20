import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Identity } from "@/lib/auth/identity";

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

import {
  requireStaff,
  requireSuperadmin,
  requireSuperadminApi,
  resolveLandingRoute,
} from "./guards";

function identity(partial: Partial<Identity>): Identity {
  return {
    userId: "user_1",
    email: "test@test.rs",
    isSuperadmin: false,
    memberships: [],
    ...partial,
  };
}

const superadmin = identity({ isSuperadmin: true });
const staff = identity({
  memberships: [
    { organizationId: "psihointegritet", roles: ["org_admin", "therapist"] },
  ],
});
const client = identity({
  memberships: [{ organizationId: "psihointegritet", roles: ["client"] }],
});
const noRoles = identity({});
const adminOnly = identity({
  memberships: [{ organizationId: "psihointegritet", roles: ["org_admin"] }],
});
const therapistOnly = identity({
  memberships: [{ organizationId: "psihointegritet", roles: ["therapist"] }],
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
      memberships: [
        { organizationId: "psihointegritet", roles: ["org_admin"] },
      ],
    });
    expect(resolveLandingRoute(superadminAndStaff)).toBe("/superadmin");
  });

  it("sends every staff role combination to /radni-prostor", () => {
    for (const who of [adminOnly, therapistOnly, staff]) {
      expect(resolveLandingRoute(who)).toBe("/radni-prostor");
    }
  });

  it("sends clients and role-less users to /nalog", () => {
    for (const who of [client, noRoles]) {
      expect(resolveLandingRoute(who)).toBe("/nalog");
    }
  });
});
