import { describe, expect, it, vi } from "vitest";

const { getSessionIdentityMock } = vi.hoisted(() => ({
  getSessionIdentityMock: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/auth/session/server-identity", () => ({
  getSessionIdentity: getSessionIdentityMock,
}));
vi.mock("react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react")>();
  return {
    ...actual,
    cache: <T>(loader: () => Promise<T>) => {
      let result: Promise<T> | undefined;
      return () => (result ??= loader());
    },
  };
});

import { getServerIdentity } from "./identity-server";

describe("request-scoped server identity", () => {
  it("deduplicates layout, locale and page-guard reads in one request", async () => {
    const identity = {
      userId: "user_1",
      email: "person@example.test",
      displayName: "Person",
      isSuperadmin: false,
      memberships: [
        { organizationSlug: "psihointegritet", roles: ["org_admin"] },
      ],
    };
    getSessionIdentityMock.mockResolvedValue(identity);

    const [layout, locale, page] = await Promise.all([
      getServerIdentity(),
      getServerIdentity(),
      getServerIdentity(),
    ]);

    expect(layout).toBe(identity);
    expect(locale).toBe(identity);
    expect(page).toBe(identity);
    expect(getSessionIdentityMock).toHaveBeenCalledTimes(1);
  });
});
