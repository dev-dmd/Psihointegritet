import { beforeEach, describe, expect, it, vi } from "vitest";

const { cookiesMock, fetchMock } = vi.hoisted(() => ({
  cookiesMock: vi.fn(),
  fetchMock: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({ cookies: cookiesMock, headers: vi.fn() }));
vi.mock("@/lib/validation/env", () => ({
  serverEnv: {
    NEXT_PUBLIC_API_URL: "https://api.test",
    DEPLOYMENT_ENV: "development",
  },
}));

import { PLATFORM_SESSION_COOKIE } from "./cookies";
import { getSessionIdentity } from "./server-identity";
import { getServerToken, hasServerSession } from "./server-session";

describe("the session the server reads from the cookie", () => {
  beforeEach(() => {
    cookiesMock.mockReset();
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
    cookiesMock.mockResolvedValue({ get: () => undefined });
  });

  it("reports no token and no session for an anonymous request", async () => {
    expect(await getServerToken()).toBeNull();
    expect(await hasServerSession()).toBe(false);
  });

  it("reads the platform cookie, not the tenant one", async () => {
    // The two kinds are separate on purpose (D-083). A platform guard that
    // accepted a tenant client's cookie would be the Marysoll collision.
    const get = vi.fn().mockReturnValue(undefined);
    cookiesMock.mockResolvedValue({ get });

    await getServerToken();
    expect(get).toHaveBeenCalledWith(PLATFORM_SESSION_COOKIE);
  });

  it("hands the cookie value on as the bearer token", async () => {
    cookiesMock.mockResolvedValue({
      get: (name: string) =>
        name === PLATFORM_SESSION_COOKIE
          ? { value: "opaque-token" }
          : undefined,
    });

    expect(await getServerToken()).toBe("opaque-token");
    expect(await hasServerSession()).toBe(true);
  });

  it("treats an empty cookie as no session rather than an empty token", async () => {
    // A cleared cookie can arrive as `""`. Passing that on would send
    // `Authorization: Bearer ` and turn "signed out" into a 401 that reads as
    // a broken backend.
    cookiesMock.mockResolvedValue({ get: () => ({ value: "" }) });

    expect(await getServerToken()).toBeNull();
  });

  it("never calls a backend for an identity on an anonymous request", async () => {
    expect(await getSessionIdentity()).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("asks the backend with the token it read, and never in the URL", async () => {
    cookiesMock.mockResolvedValue({
      get: () => ({ value: "opaque-token" }),
    });
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        userId: "user_1",
        email: "sanja@example.test",
        displayName: null,
        isSuperadmin: false,
        memberships: [],
      }),
    });

    const identity = await getSessionIdentity();

    expect(identity?.userId).toBe("user_1");
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.test/api/v1/me");
    // A credential in a URL ends up in access logs, referrers and browser
    // history. It belongs in a header, and only in a header.
    expect(url).not.toContain("opaque-token");
    expect((init.headers as Record<string, string>).Authorization).toBe(
      "Bearer opaque-token",
    );
  });
});
