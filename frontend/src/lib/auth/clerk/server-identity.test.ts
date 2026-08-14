import { beforeEach, describe, expect, it, vi } from "vitest";

const { authMock, currentUserMock, fetchMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  currentUserMock: vi.fn(),
  fetchMock: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@clerk/nextjs/server", () => ({
  auth: authMock,
  currentUser: currentUserMock,
}));
vi.mock("@/lib/validation/env", () => ({
  serverEnv: { NEXT_PUBLIC_API_URL: "https://api.test" },
}));

import { getClerkServerIdentity } from "./server-identity";

function clerkUser(email = "test@test.rs") {
  return {
    primaryEmailAddress: { emailAddress: email },
  };
}

function backendIdentity(overrides: object = {}) {
  return {
    userId: "user_1",
    email: "test@test.rs",
    displayName: null,
    isSuperadmin: false,
    memberships: [],
    ...overrides,
  };
}

describe("getClerkServerIdentity", () => {
  beforeEach(() => {
    authMock.mockReset();
    currentUserMock.mockReset();
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  it("returns null when signed out", async () => {
    authMock.mockResolvedValue({ userId: null, getToken: vi.fn() });
    expect(await getClerkServerIdentity()).toBeNull();
    expect(currentUserMock).not.toHaveBeenCalled();
  });

  it("returns identity and roles from the backend", async () => {
    authMock.mockResolvedValue({
      userId: "user_1",
      getToken: vi.fn().mockResolvedValue("token"),
    });
    currentUserMock.mockResolvedValue(clerkUser());
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify(backendIdentity())),
    );
    expect(await getClerkServerIdentity()).toEqual({
      userId: "user_1",
      email: "test@test.rs",
      displayName: null,
      isSuperadmin: false,
      memberships: [],
    });
  });

  it("maps the backend superadmin flag", async () => {
    authMock.mockResolvedValue({
      userId: "user_2",
      getToken: vi.fn().mockResolvedValue("token"),
    });
    currentUserMock.mockResolvedValue(clerkUser());
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify(
          backendIdentity({ userId: "user_2", isSuperadmin: true }),
        ),
      ),
    );
    const identity = await getClerkServerIdentity();
    expect(identity?.isSuperadmin).toBe(true);
    expect(identity?.memberships).toEqual([]);
  });

  it("maps backend staff memberships", async () => {
    authMock.mockResolvedValue({
      userId: "user_3",
      getToken: vi.fn().mockResolvedValue("token"),
    });
    currentUserMock.mockResolvedValue(clerkUser());
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify(
          backendIdentity({
            userId: "user_3",
            memberships: [
              { organizationId: "org-1", roles: ["org_admin", "therapist"] },
            ],
          }),
        ),
      ),
    );
    const identity = await getClerkServerIdentity();
    expect(identity?.memberships).toEqual([
      { organizationId: "org-1", roles: ["org_admin", "therapist"] },
    ]);
  });

  it("skips Clerk user lookup when backend presentation fields are complete", async () => {
    authMock.mockResolvedValue({
      userId: "user_complete",
      getToken: vi.fn().mockResolvedValue("token"),
    });
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify(
          backendIdentity({
            userId: "user_complete",
            email: "complete@example.test",
            displayName: "Complete Person",
          }),
        ),
      ),
    );

    await expect(getClerkServerIdentity()).resolves.toMatchObject({
      email: "complete@example.test",
      displayName: "Complete Person",
    });
    expect(currentUserMock).not.toHaveBeenCalled();
  });

  it("tolerates a missing user record", async () => {
    authMock.mockResolvedValue({
      userId: "user_4",
      getToken: vi.fn().mockResolvedValue("token"),
    });
    currentUserMock.mockResolvedValue(null);
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify(backendIdentity({ userId: "user_4", email: null })),
      ),
    );
    expect(await getClerkServerIdentity()).toEqual({
      userId: "user_4",
      email: null,
      displayName: null,
      isSuperadmin: false,
      memberships: [],
    });
  });

  it("explains that a 404 means the backend revision is stale", async () => {
    authMock.mockResolvedValue({
      userId: "user_5",
      getToken: vi.fn().mockResolvedValue("token"),
    });
    fetchMock.mockResolvedValue(new Response(null, { status: 404 }));

    await expect(getClerkServerIdentity()).rejects.toThrow(
      "Restart or redeploy the backend from the same revision as the frontend",
    );
    expect(currentUserMock).not.toHaveBeenCalled();
  });
});

describe("display name", () => {
  it("prefers the provider's full name", async () => {
    currentUserMock.mockResolvedValue({
      fullName: "Maria Bullock",
      firstName: "Maria",
      lastName: "Bullock",
      primaryEmailAddress: { emailAddress: "maria@psihointegritet.com" },
    });
    authMock.mockResolvedValue({
      userId: "user_9",
      getToken: vi.fn().mockResolvedValue("token"),
    });
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify(
          backendIdentity({
            userId: "user_9",
            email: "maria@psihointegritet.com",
          }),
        ),
      ),
    );

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
    });
    authMock.mockResolvedValue({
      userId: "user_10",
      getToken: vi.fn().mockResolvedValue("token"),
    });
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify(backendIdentity({ userId: "user_10", email: null })),
      ),
    );

    await expect(getClerkServerIdentity()).resolves.toMatchObject({
      displayName: "Maria",
    });
  });
});
