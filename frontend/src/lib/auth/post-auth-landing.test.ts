import { afterEach, describe, expect, it } from "vitest";

import type { Identity } from "@/lib/auth/identity";
import { resolveLanding } from "@/lib/auth/post-auth-landing";

// Production, so the cross-origin return leg is the one being asserted. The
// non-production shape — a same-origin `/sanja-neuer/nalog` — has its own test.
const platform = {
  surface: "platform",
  tenantSlug: null,
  locale: "sr-Latn",
  deploymentEnv: "production",
} as const;
const onPsiho = {
  surface: "tenant",
  tenantSlug: "psihointegritet",
  locale: "sr-Latn",
  deploymentEnv: "production",
} as const;
const onSanja = {
  surface: "tenant",
  tenantSlug: "sanja-neuer",
  locale: "sr-Latn",
  deploymentEnv: "production",
} as const;

function identity(overrides: Partial<Identity> = {}): Identity {
  return {
    userId: "user_1",
    email: "person@example.com",
    displayName: null,
    isSuperadmin: false,
    memberships: [],
    ...overrides,
  };
}

const staffAt = (slug: string) => ({
  organizationSlug: slug,
  roles: ["therapist" as const],
});
const clientAt = (slug: string) => ({
  organizationSlug: slug,
  roles: ["client" as const],
});

afterEach(() => {
  delete process.env.PLATFORM_HOST;
});

describe("where a person lands after signing in", () => {
  it("never sends anybody to the platform's client area", () => {
    // `/nalog` is 404 on a platform-only host. The old constant fallback sent
    // everyone there, which is the bug this dispatcher exists to close.
    for (const who of [
      identity({ isSuperadmin: true }),
      identity({ memberships: [staffAt("psihointegritet")] }),
      identity({ memberships: [clientAt("sanja-neuer")] }),
      identity(),
    ]) {
      const landing = resolveLanding(who, platform);
      if (landing.kind === "platform") {
        expect(landing.path).not.toBe("/nalog");
        expect(landing.path).not.toBe("/account");
      }
    }
  });

  it("sends a superadmin to the operator console", () => {
    expect(resolveLanding(identity({ isSuperadmin: true }), platform)).toEqual({
      kind: "platform",
      path: "/superadmin",
    });
  });

  it("outranks membership with the global superadmin flag", () => {
    // A superadmin who is also somebody's client must not be dropped into the
    // client area just because the membership sorts first.
    const landing = resolveLanding(
      identity({ isSuperadmin: true, memberships: [clientAt("sanja-neuer")] }),
      onSanja,
    );
    expect(landing).toEqual({ kind: "platform", path: "/superadmin" });
  });

  it("sends staff to the workspace, wherever they signed in", () => {
    const who = identity({ memberships: [staffAt("psihointegritet")] });
    for (const context of [platform, onPsiho, onSanja]) {
      expect(resolveLanding(who, context)).toEqual({
        kind: "platform",
        path: "/radni-prostor",
      });
    }
  });

  it("keeps a client on the host they arrived at", () => {
    // Sanja's client signing in on her domain stays in her space and is never
    // told the platform exists.
    expect(
      resolveLanding(
        identity({ memberships: [clientAt("sanja-neuer")] }),
        onSanja,
      ),
    ).toEqual({ kind: "platform", path: "/nalog" });
  });

  it("returns a client who came through the platform to their own practice", () => {
    // Under Clerk satellite domains this is the return leg: the person was
    // carried to the primary domain to sign in and has to be sent home.
    expect(
      resolveLanding(
        identity({ memberships: [clientAt("sanja-neuer")] }),
        platform,
      ),
    ).toEqual({ kind: "tenant", url: "https://sanja-neuer.vercel.app/nalog" });
  });

  it("keeps that return leg inside the environment they signed in to", () => {
    // On staging the same person must land on staging, not on the live site.
    // Same-origin, so `safeReturnPath` — which refuses absolute URLs — accepts
    // it, which the production shape never could.
    expect(
      resolveLanding(identity({ memberships: [clientAt("sanja-neuer")] }), {
        ...platform,
        deploymentEnv: "staging",
      }),
    ).toEqual({ kind: "tenant", url: "/sanja-neuer/nalog" });
  });

  it("refuses to guess when a client belongs to more than one practice", () => {
    // Two equally valid homes. Picking one would drop somebody into a practice
    // that is not the one they meant.
    expect(
      resolveLanding(
        identity({
          memberships: [clientAt("sanja-neuer"), clientAt("psihointegritet")],
        }),
        platform,
      ),
    ).toEqual({ kind: "denied" });
  });

  it("refuses a verified account that has been granted nothing", () => {
    // A real state: provisioned, signed in, no role yet.
    expect(resolveLanding(identity(), platform)).toEqual({ kind: "denied" });
    expect(resolveLanding(null, platform)).toEqual({ kind: "denied" });
  });

  it("treats a staff role as staff even alongside a client role elsewhere", () => {
    expect(
      resolveLanding(
        identity({
          memberships: [clientAt("sanja-neuer"), staffAt("psihointegritet")],
        }),
        onSanja,
      ),
    ).toEqual({ kind: "platform", path: "/radni-prostor" });
  });
});
