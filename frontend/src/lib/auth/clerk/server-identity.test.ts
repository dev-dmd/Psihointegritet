import { beforeEach, describe, expect, it, vi } from "vitest";

const { authMock, currentUserMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  currentUserMock: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@clerk/nextjs/server", () => ({
  auth: authMock,
  currentUser: currentUserMock,
}));

import { getClerkServerIdentity } from "./server-identity";

function clerkUser(publicMetadata: unknown, email = "test@test.rs") {
  return {
    publicMetadata,
    primaryEmailAddress: { emailAddress: email },
  };
}

describe("getClerkServerIdentity", () => {
  beforeEach(() => {
    authMock.mockReset();
    currentUserMock.mockReset();
  });

  it("returns null when signed out", async () => {
    authMock.mockResolvedValue({ userId: null });
    expect(await getClerkServerIdentity()).toBeNull();
    expect(currentUserMock).not.toHaveBeenCalled();
  });

  it("returns identity without roles when metadata is empty", async () => {
    authMock.mockResolvedValue({ userId: "user_1" });
    currentUserMock.mockResolvedValue(clerkUser({}));
    expect(await getClerkServerIdentity()).toEqual({
      userId: "user_1",
      email: "test@test.rs",
      displayName: null,
      isSuperadmin: false,
      memberships: [],
    });
  });

  it("maps the superadmin flag", async () => {
    authMock.mockResolvedValue({ userId: "user_2" });
    currentUserMock.mockResolvedValue(clerkUser({ superadmin: true }));
    const identity = await getClerkServerIdentity();
    expect(identity?.isSuperadmin).toBe(true);
    expect(identity?.memberships).toEqual([]);
  });

  it("maps staff roles into one membership", async () => {
    authMock.mockResolvedValue({ userId: "user_3" });
    currentUserMock.mockResolvedValue(
      clerkUser({ roles: ["org_admin", "therapist"], org: "psihointegritet" }),
    );
    const identity = await getClerkServerIdentity();
    expect(identity?.memberships).toEqual([
      { organizationId: "psihointegritet", roles: ["org_admin", "therapist"] },
    ]);
  });

  it("tolerates a missing user record", async () => {
    authMock.mockResolvedValue({ userId: "user_4" });
    currentUserMock.mockResolvedValue(null);
    expect(await getClerkServerIdentity()).toEqual({
      userId: "user_4",
      email: null,
      displayName: null,
      isSuperadmin: false,
      memberships: [],
    });
  });
});

describe("display name", () => {
  it("prefers the provider's full name", async () => {
    currentUserMock.mockResolvedValue({
      fullName: "Maria Bullock",
      firstName: "Maria",
      lastName: "Bullock",
      primaryEmailAddress: { emailAddress: "maria@psihointegritet.com" },
      publicMetadata: {},
    });
    authMock.mockResolvedValue({ userId: "user_9" });

    await expect(getClerkServerIdentity()).resolves.toMatchObject({
      displayName: "Maria Bullock",
    });
  });

  it("assembles a name when the provider has only the parts", async () => {
    // Clerk fills `fullName` only when both halves are set, so a user with a
    // first name alone would otherwise be nameless — and the sidebar would show
    // the generic label to someone who does have a name.
    currentUserMock.mockResolvedValue({
      fullName: null,
      firstName: "Maria",
      lastName: null,
      primaryEmailAddress: null,
      publicMetadata: {},
    });
    authMock.mockResolvedValue({ userId: "user_10" });

    await expect(getClerkServerIdentity()).resolves.toMatchObject({
      displayName: "Maria",
    });
  });
});
