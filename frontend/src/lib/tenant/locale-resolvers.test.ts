import { readFileSync } from "node:fs";
import { join } from "node:path";

import { beforeEach, describe, expect, it, vi } from "vitest";

const { serverEnvMock, getServerIdentityMock } = vi.hoisted(() => ({
  serverEnvMock: { DEFAULT_ORGANIZATION_SLUG: "psihointegritet" },
  getServerIdentityMock: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/validation/env", () => ({ serverEnv: serverEnvMock }));
vi.mock("@/lib/auth/identity-server", () => ({
  getServerIdentity: getServerIdentityMock,
}));

import { resolvePublicLocale } from "./public-locale";
import {
  OrganizationMismatchError,
  resolveWorkspaceLocale,
} from "./workspace-locale";

beforeEach(() => {
  serverEnvMock.DEFAULT_ORGANIZATION_SLUG = "psihointegritet";
  getServerIdentityMock.mockReset();
  getServerIdentityMock.mockResolvedValue(null);
});

describe("PublicDeploymentLocaleResolver", () => {
  it("follows the content locale, not the panel locale", async () => {
    await expect(resolvePublicLocale()).resolves.toBe("sr-Latn");
  });

  it("resolves without any authenticated identity", async () => {
    // A public visitor has no session. If this ever needed one, every public
    // page would become request-time.
    await resolvePublicLocale();
    expect(getServerIdentityMock).not.toHaveBeenCalled();
  });
});

describe("ActiveWorkspaceLocaleResolver", () => {
  it("resolves the organization ui locale for a signed-in member", async () => {
    getServerIdentityMock.mockResolvedValue({
      userId: "user_1",
      email: null,
      isSuperadmin: false,
      memberships: [
        { organizationId: "psihointegritet", roles: ["org_admin"] },
      ],
    });

    await expect(resolveWorkspaceLocale()).resolves.toBe("sr-Latn");
  });

  it("resolves for a superadmin holding no membership", async () => {
    // Superadmins legitimately hold no membership (D-051), and `memberships`
    // is empty for everyone until the backend identity slice lands. Neither is
    // a mismatch.
    getServerIdentityMock.mockResolvedValue({
      userId: "user_2",
      email: null,
      isSuperadmin: true,
      memberships: [],
    });

    await expect(resolveWorkspaceLocale()).resolves.toBe("sr-Latn");
  });

  it("throws when the membership organization is not the deployment one", async () => {
    // The C2(a) tripwire: one deployment serves exactly one organization.
    // A mismatch means a mis-provisioned user or an attempt at host-shared
    // tenancy without the ADR-023 milestone — never a language to guess at.
    getServerIdentityMock.mockResolvedValue({
      userId: "user_3",
      email: null,
      isSuperadmin: false,
      memberships: [{ organizationId: "druga-organizacija", roles: [] }],
    });

    await expect(resolveWorkspaceLocale()).rejects.toThrow(
      OrganizationMismatchError,
    );
  });
});

describe("public rendering contract", () => {
  // Static guard rather than a runtime one: the failure it prevents is not an
  // exception but a silent loss of static rendering across the public site,
  // which no unit test can observe. The build output is the only other place
  // it shows up, and by then it has shipped.
  const requestApiPattern =
    /from\s+["']next\/headers["']|\b(headers|cookies|draftMode)\s*\(\s*\)/;

  const publicPath = ["public-locale.ts", "org-context.ts", "organizations.ts"];

  it.each(publicPath)("%s reads no request-time API", (file) => {
    const source = readFileSync(join(__dirname, file), "utf8");
    const code = source.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, "");
    expect(code).not.toMatch(requestApiPattern);
  });
});
