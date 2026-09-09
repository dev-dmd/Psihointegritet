import { beforeEach, describe, expect, it, vi } from "vitest";

const { tokenMock, fetchMock, headersMock, serverEnvMock } = vi.hoisted(() => ({
  tokenMock: vi.fn(),
  fetchMock: vi.fn(),
  headersMock: vi.fn(),
  serverEnvMock: {
    NEXT_PUBLIC_API_URL: "https://api.test",
    DEPLOYMENT_ENV: "development",
  },
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/auth/session/server-session", () => ({
  getServerToken: tokenMock,
}));
vi.mock("@/lib/validation/env", () => ({ serverEnv: serverEnvMock }));
vi.mock("next/headers", () => ({ headers: headersMock }));

import { getSessionIdentity } from "./server-identity";
import {
  TENANT_SLUG_HEADER,
  TENANT_SURFACE_HEADER,
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

describe("getSessionIdentity", () => {
  beforeEach(() => {
    tokenMock.mockReset();
    fetchMock.mockReset();
    headersMock.mockReset();
    serverEnvMock.DEPLOYMENT_ENV = "development";
    onSurface();
    vi.stubGlobal("fetch", fetchMock);
    tokenMock.mockResolvedValue("token");
  });

  it("returns null when nobody is signed in", async () => {
    // The state the whole platform is in until the auth engine lands: no
    // session, and therefore no reason to ask any backend anything.
    tokenMock.mockResolvedValue(null);
    expect(await getSessionIdentity()).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns identity and roles from the backend", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify(backendIdentity())),
    );
    expect(await getSessionIdentity()).toEqual({
      userId: "user_1",
      email: "test@test.rs",
      displayName: null,
      isSuperadmin: false,
      memberships: [],
    });
  });

  it("maps the backend superadmin flag", async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify(
          backendIdentity({ userId: "user_2", isSuperadmin: true }),
        ),
      ),
    );
    const identity = await getSessionIdentity();
    expect(identity?.isSuperadmin).toBe(true);
    expect(identity?.memberships).toEqual([]);
  });

  it("maps backend staff memberships", async () => {
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
    expect((await getSessionIdentity())?.memberships).toEqual([
      { organizationSlug: "org-1", roles: ["org_admin", "therapist"] },
    ]);
  });

  it("takes presentation fields from PostgreSQL, with no provider fallback", async () => {
    // The Clerk adapter fell back to the provider's user profile for the name
    // and email. There is no provider now, and there does not need to be:
    // `internal_users` already holds both, and one authoritative answer beats
    // two that can disagree.
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
    await expect(getSessionIdentity()).resolves.toMatchObject({
      email: "complete@example.test",
      displayName: "Complete Person",
    });
  });

  it("tolerates a backend record with no name or email", async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify(backendIdentity({ userId: "user_4", email: null })),
      ),
    );
    expect(await getSessionIdentity()).toEqual({
      userId: "user_4",
      email: null,
      displayName: null,
      isSuperadmin: false,
      memberships: [],
    });
  });

  it("explains that a 404 means the backend revision is stale", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 404 }));
    await expect(getSessionIdentity()).rejects.toThrow(
      "Restart or redeploy the backend from the same revision as the frontend",
    );
  });
});

describe("which backend answers", () => {
  beforeEach(() => {
    tokenMock.mockReset();
    fetchMock.mockReset();
    headersMock.mockReset();
    // The registry holds production URLs, so only production consults it.
    serverEnvMock.DEPLOYMENT_ENV = "production";
    vi.stubGlobal("fetch", fetchMock);
    tokenMock.mockResolvedValue("token");
    // A fresh Response per call: the platform surface calls several backends,
    // and one body cannot be read twice.
    fetchMock.mockImplementation(
      async () => new Response(JSON.stringify(backendIdentity())),
    );
  });

  it("asks the one backend of this environment, whatever the surface", async () => {
    // One production backend over one production database, one staging backend
    // over one staging database — the API base belongs to the environment, not
    // to a tenant (D-081). The registry no longer carries one.
    for (const surface of ["platform", "tenant"] as const) {
      fetchMock.mockClear();
      onSurface(surface, surface === "tenant" ? "sanja-neuer" : undefined);
      await getSessionIdentity();
      expect(fetchedHosts()).toEqual(["https://api.test/api/v1/me"]);
    }
  });

  it("asks the backend that issued the session, and only it", async () => {
    onSurface("platform");
    await getSessionIdentity();

    // It used to ask every registered backend and merge the answers, which was
    // right while a session was a Clerk JWT any backend could verify. A PDC
    // session is a row in one database (D-083), so every other backend answers
    // 401 by construction. On a tenant surface that was worse than useless:
    // signing in at `sanjaneuer.com/prijava` got a session from the platform
    // backend and had it checked against a different one, so it could not work.
    expect(fetchedHosts()).toEqual(["https://api.test/api/v1/me"]);
  });

  it("reads an unknown session as signed out rather than as an error", async () => {
    onSurface("platform");
    fetchMock.mockResolvedValue(new Response("", { status: 401 }));

    // `getServerToken` documents this: an expired, revoked or forged cookie is
    // "a token the backend does not know, which reads as not signed in". It has
    // to redirect to sign-in — throwing would show an error page to everyone
    // whose session simply aged out, which is everyone, eventually.
    await expect(getSessionIdentity()).resolves.toBeNull();
  });

  it("reads a refused session as signed out too", async () => {
    onSurface("platform");
    fetchMock.mockResolvedValue(new Response("", { status: 403 }));
    await expect(getSessionIdentity()).resolves.toBeNull();
  });

  it("still fails when a backend is genuinely broken", async () => {
    onSurface("platform");
    fetchMock.mockResolvedValue(new Response("", { status: 500 }));

    // A silent empty identity would read as "no roles" and lock an owner out of
    // their own workspace.
    await expect(getSessionIdentity()).rejects.toThrow(/500/);
  });

  it("falls back to the configured API only when no proxy stamped a surface", async () => {
    onSurface();
    await getSessionIdentity();

    expect(fetchedHosts()).toEqual(["https://api.test/api/v1/me"]);
  });

  it("never consults the registry outside production", async () => {
    // A laptop, a preview and staging each have exactly one backend, and it is
    // not the production one. Reading the registry here sent a development
    // session to the production API, which rejected the token and returned no
    // memberships — a workspace with no panels and nothing logged to explain it.
    for (const env of ["development", "preview", "staging"]) {
      serverEnvMock.DEPLOYMENT_ENV = env;
      fetchMock.mockClear();
      onSurface("platform");
      await getSessionIdentity();

      expect(fetchedHosts()).toEqual(["https://api.test/api/v1/me"]);
    }
  });

  it("keeps a tenant surface on the configured API outside production too", async () => {
    serverEnvMock.DEPLOYMENT_ENV = "development";
    onSurface("tenant", "sanja-neuer");
    await getSessionIdentity();

    expect(fetchedHosts()).toEqual(["https://api.test/api/v1/me"]);
  });
});
