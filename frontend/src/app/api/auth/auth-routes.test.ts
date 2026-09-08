import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * What must never leave the server.
 *
 * These handlers exist so the opaque session token can cross from FastAPI into
 * an `HttpOnly` cookie without passing through anything a script can read. The
 * first test is the whole point of the design and the one that would catch
 * somebody adding the token to the response "so the client can show the
 * expiry" — which is how a well-meant convenience becomes an XSS payload.
 */

const { fetchMock, translationsMock } = vi.hoisted(() => ({
  fetchMock: vi.fn(),
  translationsMock: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("next-intl/server", () => ({ getTranslations: translationsMock }));
vi.mock("@/lib/validation/env", () => ({
  serverEnv: {
    NEXT_PUBLIC_API_URL: "https://api.test",
    DEPLOYMENT_ENV: "production",
  },
}));

const { cookiesMock } = vi.hoisted(() => ({ cookiesMock: vi.fn() }));
vi.mock("next/headers", () => ({ cookies: cookiesMock, headers: vi.fn() }));

import { PLATFORM_SESSION_COOKIE } from "@/lib/auth/session/cookies";

import { POST as passwordReset } from "./password-reset/route";
import { POST as register } from "./register/route";
import { POST as signIn } from "./sign-in/route";
import { POST as signOut } from "./sign-out/route";

const TOKEN = "opaque-session-token-nobody-should-see";

function post(body: unknown): Request {
  return new Request("https://p-digital-center.test/api/auth/sign-in", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function backendIssues(): void {
  fetchMock.mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => ({
      token: TOKEN,
      expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
    }),
  });
}

function backendRefuses(status: number, detail: string): void {
  fetchMock.mockResolvedValue({
    ok: false,
    status,
    json: async () => ({ detail }),
  });
}

beforeEach(() => {
  fetchMock.mockReset();
  cookiesMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  cookiesMock.mockResolvedValue({ get: () => undefined });
  // The handlers only ever render a message; echoing the key keeps assertions
  // readable without pulling the catalogue in.
  translationsMock.mockResolvedValue((key: string) => key);
});

describe("sign-in", () => {
  it("puts the token in an HttpOnly cookie and nowhere in the body", async () => {
    backendIssues();

    const response = await signIn(post({ email: "a@b.test", password: "x" }));
    const body = await response.text();

    expect(response.status).toBe(200);
    // The assertion the whole design rests on.
    expect(body).not.toContain(TOKEN);
    expect(JSON.parse(body)).toEqual({ ok: true });

    const cookie = response.cookies.get(PLATFORM_SESSION_COOKIE);
    expect(cookie?.value).toBe(TOKEN);
    expect(cookie?.httpOnly).toBe(true);
    expect(cookie?.secure).toBe(true);
    expect(cookie?.sameSite).toBe("lax");
    expect(cookie?.path).toBe("/");
    // Host-only: no `domain`, so one tenant's domain never even sends it to
    // another's.
    expect(cookie?.domain).toBeUndefined();
  });

  it("never lets a session response be cached", async () => {
    backendIssues();

    const response = await signIn(post({ email: "a@b.test", password: "x" }));

    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
  });

  it("passes the backend's refusal through without inventing a reason", async () => {
    // The backend already reduced wrong password, unknown address and throttled
    // account to one sentence. Re-expanding them here would be a second,
    // unreviewed disclosure policy.
    backendRefuses(401, "Neispravna email adresa ili lozinka.");

    const response = await signIn(post({ email: "a@b.test", password: "x" }));

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({
      ok: false,
      message: "Neispravna email adresa ili lozinka.",
    });
    expect(response.cookies.get(PLATFORM_SESSION_COOKIE)).toBeUndefined();
  });

  it("says the service is unreachable rather than blaming the password", async () => {
    fetchMock.mockRejectedValue(new Error("ECONNREFUSED"));

    const response = await signIn(post({ email: "a@b.test", password: "x" }));

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      ok: false,
      message: "authUnreachable",
    });
  });

  it("refuses an empty or malformed body before reaching the backend", async () => {
    for (const body of [{}, { email: "a@b.test" }, { password: "x" }]) {
      const response = await signIn(post(body));
      expect(response.status).toBe(400);
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("registration", () => {
  it("sets the same cookie and returns the same empty body", async () => {
    backendIssues();

    const response = await register(
      post({
        email: "a@b.test",
        password: "x".repeat(12),
        displayName: " Ana ",
      }),
    );

    expect(await response.text()).not.toContain(TOKEN);
    expect(response.cookies.get(PLATFORM_SESSION_COOKIE)?.httpOnly).toBe(true);

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    // Trimmed, and sent as `null` when blank, so a name of spaces does not
    // become somebody's display name.
    expect(JSON.parse(String(init.body))).toMatchObject({ displayName: "Ana" });
  });
});

describe("password reset", () => {
  it("issues no session and clears the cookies instead", async () => {
    // The backend revokes every session of the account as part of a reset.
    // Handing one straight back would make an exception for exactly the
    // request an attacker would be making.
    fetchMock.mockResolvedValue({
      ok: true,
      status: 204,
      json: async () => ({}),
    });

    const response = await passwordReset(
      post({ token: "one-time", password: "x".repeat(12) }),
    );

    expect(await response.json()).toEqual({ ok: true });
    expect(response.cookies.get(PLATFORM_SESSION_COOKIE)?.value).toBe("");
  });
});

describe("sign-out", () => {
  it("revokes the row and then clears the cookie", async () => {
    cookiesMock.mockResolvedValue({ get: () => ({ value: TOKEN }) });
    fetchMock.mockResolvedValue({
      ok: true,
      status: 204,
      json: async () => ({}),
    });

    const response = await signOut();

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.test/api/v1/auth/platform/logout");
    expect((init.headers as Record<string, string>).Authorization).toBe(
      `Bearer ${TOKEN}`,
    );
    expect(response.cookies.get(PLATFORM_SESSION_COOKIE)?.value).toBe("");
  });

  it("clears the cookie even when the backend is unreachable", async () => {
    // Somebody who clicked "sign out" must end up signed out of the browser in
    // front of them. A stranded row expiring on its own is the smaller problem.
    cookiesMock.mockResolvedValue({ get: () => ({ value: TOKEN }) });
    fetchMock.mockRejectedValue(new Error("ECONNREFUSED"));

    const response = await signOut();

    expect(response.status).toBe(200);
    expect(response.cookies.get(PLATFORM_SESSION_COOKIE)?.value).toBe("");
  });
});
