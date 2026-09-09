// @vitest-environment node
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import proxy from "./proxy";
import {
  TENANT_SLUG_HEADER,
  TENANT_SURFACE_HEADER,
} from "@/lib/tenant/domain-registry";

/**
 * The proxy had no test, and every risk in it is step ordering: which path each
 * decision reads, and whether the tenant prefix is on or off at that moment.
 * Those are exactly the failures a pure-function test of the helpers cannot
 * see — each helper is right and the sequence is wrong.
 *
 * Node environment on purpose: the suite runs jsdom, and `NextRequest` needs
 * Node's fetch globals.
 */

const PLATFORM = "p-digital-center.com";

const originalEnv = {
  DEPLOYMENT_ENV: process.env.DEPLOYMENT_ENV,
  PLATFORM_HOST: process.env.PLATFORM_HOST,
  DEFAULT_ORGANIZATION_SLUG: process.env.DEFAULT_ORGANIZATION_SLUG,
};

beforeEach(() => {
  process.env.PLATFORM_HOST = PLATFORM;
  process.env.DEFAULT_ORGANIZATION_SLUG = "psihointegritet";
});

afterEach(() => {
  for (const [key, value] of Object.entries(originalEnv)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

function get(path: string, host = PLATFORM, cookie?: string) {
  const headers = new Headers({ host });
  if (cookie) headers.set("cookie", cookie);
  return new NextRequest(`https://${host}${path}`, { headers });
}

/** Where the response says the request was actually served from. */
function rewrittenTo(response: Response): string | null {
  const target = response.headers.get("x-middleware-rewrite");
  return target === null
    ? null
    : new URL(target).pathname + new URL(target).search;
}

function stamp(response: Response) {
  return {
    surface: response.headers.get(TENANT_SURFACE_HEADER),
    tenant: response.headers.get(TENANT_SLUG_HEADER),
    robots: response.headers.get("X-Robots-Tag"),
  };
}

describe("outside production, a path names the tenant", () => {
  beforeEach(() => {
    process.env.DEPLOYMENT_ENV = "staging";
  });

  it("serves the platform its own front page at the root", async () => {
    const response = await proxy(get("/"));
    expect(rewrittenTo(response)).toBe("/platform-home");
    expect(stamp(response).surface).toBe("platform");
  });

  it("serves a tenant's public site from its slug", async () => {
    const response = await proxy(get("/sanja-neuer"));
    expect(rewrittenTo(response)).toBe("/s/sanja-neuer/");
    expect(stamp(response)).toMatchObject({
      surface: "tenant",
      tenant: "sanja-neuer",
    });
  });

  it("serves the founding tenant from its legacy tree, with no /s/ segment", async () => {
    // `usesLegacyPublicTree` means nothing is rewritten onto the segment — the
    // prefix is simply removed and `app/(public)/usluge` answers. Getting this
    // wrong sends it to `/s/psihointegritet/usluge`, which does not exist.
    const response = await proxy(get("/psihointegritet/usluge"));
    expect(rewrittenTo(response)).toBe("/usluge");
    expect(stamp(response)).toMatchObject({
      surface: "tenant",
      tenant: "psihointegritet",
    });
  });

  it("never lets a prefixed request pass through to the filesystem", async () => {
    // `NextResponse.next()` on `/psihointegritet/usluge` would 404: there is no
    // such file. A prefix always implies a rewrite.
    const response = await proxy(get("/psihointegritet/usluge"));
    expect(rewrittenTo(response)).not.toBeNull();
  });

  it("keeps an owner surface off a tenant's path", async () => {
    // The same answer `sanjaneuer.com/radni-prostor` gets in production.
    expect((await proxy(get("/sanja-neuer/radni-prostor"))).status).toBe(404);
    expect((await proxy(get("/sanja-neuer/superadmin"))).status).toBe(404);
  });

  it("bounces the client area to sign-in and returns to the prefixed path", async () => {
    const response = await proxy(get("/sanja-neuer/nalog"));
    expect(response.status).toBe(307);
    const location = new URL(response.headers.get("location")!);
    expect(location.pathname).toBe("/prijava");
    // The tenant prefix must survive the round trip, or signing in lands the
    // person on the platform instead of back in the practice they came to.
    expect(location.searchParams.get("redirect_url")).toBe(
      "/sanja-neuer/nalog",
    );
  });

  it("refuses the internal trees, prefixed or not", async () => {
    expect((await proxy(get("/s/sanja-neuer"))).status).toBe(404);
    expect((await proxy(get("/platform-home"))).status).toBe(404);
    // Invisible to the first check, which only saw the prefix.
    expect((await proxy(get("/sanja-neuer/s/x"))).status).toBe(404);
    expect((await proxy(get("/sanja-neuer/platform-home"))).status).toBe(404);
  });

  it("refuses a first segment that names no tenant", async () => {
    // It stops being a prefix and becomes an ordinary public path, which the
    // platform host does not serve.
    expect((await proxy(get("/ne-postoji"))).status).toBe(404);
  });

  it("attaches the query string exactly once", async () => {
    // `/nalog` rewrites to `/account`, and both the decision and the proxy used
    // to append the query — `/account?tab=x?tab=x`.
    const response = await proxy(
      get("/sanja-neuer/nalog?tab=termini", PLATFORM, "pdc_platform_session=x"),
    );
    const target = rewrittenTo(response);
    expect(target).toBe("/account?tab=termini");
    expect(target!.match(/\?/g)).toHaveLength(1);
  });

  it("keeps a path-served tenant out of search results", async () => {
    // A finished tenant site sets `index: true` unconditionally, so without
    // this staging publishes a full duplicate of the real one.
    expect(stamp(await proxy(get("/sanja-neuer"))).robots).toBe(
      "noindex, nofollow",
    );
  });

  it("no longer reaches a tenant through a subdomain", async () => {
    expect((await proxy(get("/", `sanja-neuer.${PLATFORM}`))).status).toBe(404);
  });
});

describe("in production, nothing changed", () => {
  beforeEach(() => {
    process.env.DEPLOYMENT_ENV = "production";
  });

  it("serves each tenant from its own domain", async () => {
    const response = await proxy(get("/", "sanjaneuer.com"));
    expect(rewrittenTo(response)).toBe("/s/sanja-neuer/");
    expect(stamp(response)).toMatchObject({
      surface: "tenant",
      tenant: "sanja-neuer",
    });
  });

  it("serves the founding tenant's legacy tree on its own domain", async () => {
    const response = await proxy(get("/usluge", "psihointegritet.com"));
    expect(rewrittenTo(response)).toBeNull();
    expect(stamp(response)).toMatchObject({ tenant: "psihointegritet" });
  });

  it("does not read a tenant out of the path", async () => {
    // The whole safety of `!== "production"`: a production visitor typing a
    // tenant slug gets the ordinary refusal, not that tenant's site.
    expect((await proxy(get("/sanja-neuer"))).status).toBe(404);
    expect((await proxy(get("/psihointegritet/usluge"))).status).toBe(404);
  });

  it("refuses an unregistered host", async () => {
    expect((await proxy(get("/", "tudji-domen.com"))).status).toBe(404);
  });

  it("leaves a real tenant domain unindexed only when it is a stand-in", async () => {
    expect(stamp(await proxy(get("/", "sanjaneuer.com"))).robots).toBeNull();
    expect(stamp(await proxy(get("/", "sanja-neuer.vercel.app"))).robots).toBe(
      "noindex, nofollow",
    );
  });
});
