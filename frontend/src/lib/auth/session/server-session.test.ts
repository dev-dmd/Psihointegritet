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

describe("the session seam while there is no auth engine", () => {
  beforeEach(() => {
    cookiesMock.mockReset();
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
    cookiesMock.mockResolvedValue({ get: () => undefined });
  });

  it("reports no token and no session", async () => {
    expect(await getServerToken()).toBeNull();
    expect(await hasServerSession()).toBe(false);
  });

  it("reads the session cookie even though it is always absent", async () => {
    // Not decoration. Clerk's `auth()` read cookies, and that is what marked
    // every caller request-time. Without this read, Next would try to
    // prerender pages whose first statement is `redirect(SIGN_IN_URL)`.
    const get = vi.fn().mockReturnValue(undefined);
    cookiesMock.mockResolvedValue({ get });

    await getServerToken();
    expect(get).toHaveBeenCalledWith(PLATFORM_SESSION_COOKIE);
  });

  it("never calls a backend for an identity while nobody is signed in", async () => {
    // The assertion that matters: with no engine, the app must make zero
    // identity requests rather than call `/api/v1/me` and get a 401 per render.
    expect(await getSessionIdentity()).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
