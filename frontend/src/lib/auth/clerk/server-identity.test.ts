import { beforeEach, describe, expect, it, vi } from "vitest";

const { authMock, currentUserMock, fetchMock, headersMock } = vi.hoisted(
  () => ({
    authMock: vi.fn(),
    currentUserMock: vi.fn(),
    fetchMock: vi.fn(),
    headersMock: vi.fn(),
  }),
);

vi.mock("server-only", () => ({}));
vi.mock("@clerk/nextjs/server", () => ({
  auth: authMock,
  currentUser: currentUserMock,
}));
vi.mock("@/lib/validation/env", () => ({
  serverEnv: { NEXT_PUBLIC_API_URL: "https://api.test" },
}));
vi.mock("next/headers", () => ({ headers: headersMock }));

import { getClerkServerIdentity } from "./server-identity";
import {
  TENANT_DOMAINS,
  TENANT_SLUG_HEADER,
  TENANT_SURFACE_HEADER,
  tenantForSlug,
} from "@/lib/tenant/domain-registry";

/** Stand in for what the proxy stamps; no headers means no proxy ran. */
function onSurface(surface?: "tenant" | "platform", slug?: string) {
  const values = new Map<string, string>();
  if (surface) values.set(TENANT_SURFACE_HEADER, surface);
  if (slug) values.set(TENANT_SLUG_HEADER, slug);
  headersMock.mockResolvedValue({
    get: (key: string) => values.get(key) ?? null,
  });
}

function fetchedHosts() {
  return fetchMock.mock.calls.map(([url]) => String(url));
}

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
    headersMock.mockReset();
    onSurface();
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
              { organizationSlug: "org-1", roles: ["org_admin", "therapist"] },
            ],
          }),
        ),
      ),
    );
    const identity = await getClerkServerIdentity();
    expect(identity?.memberships).toEqual([
      { organizationSlug: "org-1", roles: ["org_admin", "therapist"] },
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

describe("which backend answers", () => {
  beforeEach(() => {
    // This suite sits outside the block above, so it owns its own reset.
    authMock.mockReset();
    currentUserMock.mockReset();
    fetchMock.mockReset();
    headersMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
    authMock.mockResolvedValue({
      userId: "user_1",
      getToken: vi.fn().mockResolvedValue("token"),
    });
    currentUserMock.mockResolvedValue(clerkUser());
    // A fresh Response per call: the platform surface calls several backends,
    // and one body cannot be read twice.
    fetchMock.mockImplementation(
      async () => new Response(JSON.stringify(backendIdentity())),
    );
  });

  it("asks only the tenant's own backend on a tenant surface", async () => {
    onSurface("tenant", "sanja-neuer");
    await getClerkServerIdentity();

    const sanja = tenantForSlug("sanja-neuer")!;
    const psiho = tenantForSlug("psihointegritet")!;
    expect(fetchedHosts()).toEqual([`${sanja.apiBaseUrl}/api/v1/me`]);
    // The isolation this whole slice exists for: her domain must not be able to
    // reach another tenant's database, not even to ask who someone is.
    expect(fetchedHosts().join(" ")).not.toContain(psiho.apiBaseUrl);
  });

  it("asks every backend on the shared platform surface", async () => {
    onSurface("platform");
    await getClerkServerIdentity();

    // Each database holds only its own memberships, so no single backend can
    // answer which organizations an owner belongs to.
    expect(fetchedHosts().sort()).toEqual(
      TENANT_DOMAINS.map((tenant) => `${tenant.apiBaseUrl}/api/v1/me`).sort(),
    );
  });

  it("merges memberships the tenants report separately", async () => {
    onSurface("platform");
    const [first, second] = TENANT_DOMAINS;
    fetchMock.mockImplementation(async (url: string) =>
      String(url).startsWith(first!.apiBaseUrl)
        ? new Response(
            JSON.stringify(
              backendIdentity({
                memberships: [
                  {
                    organizationSlug: first!.organizationSlug,
                    roles: ["org_admin"],
                  },
                ],
              }),
            ),
          )
        : new Response(
            JSON.stringify(
              backendIdentity({
                memberships: [
                  {
                    organizationSlug: second!.organizationSlug,
                    roles: ["therapist"],
                  },
                ],
              }),
            ),
          ),
    );

    const identity = await getClerkServerIdentity();
    expect(
      identity?.memberships
        .map((membership) => membership.organizationSlug)
        .sort(),
    ).toEqual([first!.organizationSlug, second!.organizationSlug].sort());
  });

  it("treats a backend that does not know the account as no memberships", async () => {
    onSurface("platform");
    const [first] = TENANT_DOMAINS;
    fetchMock.mockImplementation(async (url: string) =>
      String(url).startsWith(first!.apiBaseUrl)
        ? new Response(JSON.stringify(backendIdentity()))
        : new Response("", { status: 403 }),
    );

    // An owner of one practice simply has nothing from the other; 403 is an
    // ordinary answer here, not a failure.
    await expect(getClerkServerIdentity()).resolves.not.toBeNull();
  });

  it("still fails when a backend is genuinely broken", async () => {
    onSurface("platform");
    fetchMock.mockResolvedValue(new Response("", { status: 500 }));

    // A silent empty identity would read as "no roles" and lock an owner out of
    // their own workspace.
    await expect(getClerkServerIdentity()).rejects.toThrow(/500/);
  });

  it("falls back to the configured API only when no proxy stamped a surface", async () => {
    onSurface();
    await getClerkServerIdentity();

    expect(fetchedHosts()).toEqual(["https://api.test/api/v1/me"]);
  });
});
