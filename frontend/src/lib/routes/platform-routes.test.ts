import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { SUPPORTED_UI_LOCALES } from "@/i18n/locales";

import { internalPath, localizedPath } from "./localized-path";
import {
  isRouteActive,
  matchPlatformPath,
  normalizePathname,
  protectedRoutePrefixes,
} from "./match";
import {
  PLANNED_ROUTES,
  PLATFORM_ROUTES,
  PUBLIC_ROUTES,
  ROUTE_ALIASES,
  platformRootSegments,
  platformRouteIds,
  routeDefinition,
} from "./platform-routes";

const APP_ROOT = join(__dirname, "../../app");

/** Every `page.tsx` in the App Router, as a route template. */
function filesystemRoutes(directory: string, prefix = ""): string[] {
  const routes: string[] = [];
  for (const entry of readdirSync(directory)) {
    const absolute = join(directory, entry);
    if (statSync(absolute).isDirectory()) {
      // Route groups `(x)` and private folders `_x` contribute no URL segment.
      const segment =
        entry.startsWith("(") || entry.startsWith("_")
          ? prefix
          : `${prefix}/${entry}`;
      if (!entry.startsWith("_")) {
        routes.push(...filesystemRoutes(absolute, segment));
      }
    } else if (entry === "page.tsx") {
      routes.push(prefix === "" ? "/" : prefix);
    }
  }
  return routes;
}

const FILESYSTEM_ROUTES = new Set(filesystemRoutes(APP_ROOT));

describe("registry ↔ filesystem", () => {
  // `typedRoutes` compile-checks static paths but resolves dynamic templates to
  // `never`, so this is the only guarantee that a dynamic `internal` is real.
  it.each(platformRouteIds())("%s points at a real page", (routeId) => {
    expect(FILESYSTEM_ROUTES).toContain(routeDefinition(routeId).internal);
  });

  it("registers every workspace, account and superadmin page", () => {
    // Catches the inverse: a page added without a registry entry, which is
    // invisible to a Serbian organization because nothing can link to it.
    const registered = new Set(
      platformRouteIds().map((id) => routeDefinition(id).internal),
    );
    const shouldBeRegistered = [...FILESYSTEM_ROUTES].filter((route) =>
      /^\/(radni-prostor|nalog|superadmin|workspace|account)(\/|$)/.test(route),
    );

    expect(
      [...shouldBeRegistered].sort().filter((r) => !registered.has(r)),
    ).toEqual([]);
  });

  it("keeps planned routes out of the filesystem and out of path building", () => {
    // Rule: a planned route is not created until its screen exists. Registering
    // one early mints links to a 404 that look correct in review.
    for (const template of Object.values(PLANNED_ROUTES)) {
      expect(FILESYSTEM_ROUTES).not.toContain(template.en);
      expect(FILESYSTEM_ROUTES).not.toContain(template["sr-Latn"]);
    }
    const active = new Set<string>(platformRouteIds());
    for (const plannedId of Object.keys(PLANNED_ROUTES)) {
      expect(active.has(plannedId as never)).toBe(false);
    }
  });
});

describe("registry integrity", () => {
  it("has no duplicate external path within a locale", () => {
    for (const locale of SUPPORTED_UI_LOCALES) {
      const seen = new Map<string, string>();
      for (const routeId of platformRouteIds()) {
        const path = routeDefinition(routeId).paths[locale];
        expect(
          seen.get(path),
          `${path} duplicated in ${locale}`,
        ).toBeUndefined();
        seen.set(path, routeId);
      }
    }
  });

  it("declares params for exactly the routes that have dynamic segments", () => {
    for (const routeId of platformRouteIds()) {
      const definition = routeDefinition(routeId);
      const declared = [...(definition.params ?? [])];
      for (const path of [
        definition.internal,
        ...Object.values(definition.paths),
      ]) {
        const found = [...path.matchAll(/\[([^\]]+)\]/g)].map((m) => m[1]);
        expect(found).toEqual(declared);
      }
    }
  });

  it("gives a locale-neutral route the same path in every locale", () => {
    for (const routeId of platformRouteIds()) {
      const definition = routeDefinition(routeId);
      if (!("localeNeutral" in definition)) continue;
      expect(definition.paths.en).toBe(definition.paths["sr-Latn"]);
    }
  });

  it("makes the physical route reachable from at least one locale", () => {
    // `internal` must equal some locale's external path, otherwise no visitor
    // can ever produce it and the proxy has nothing to rewrite from.
    //
    // Which locale differs by surface, and that asymmetry is the current state
    // rather than an oversight: the workspace moved to English segments in
    // ROUTE-I18N-3, while the client panel still lives at `/nalog` on disk. The
    // proxy rewrites on path difference, not on locale, precisely so both work.
    for (const routeId of platformRouteIds()) {
      const definition = routeDefinition(routeId);
      expect(
        Object.values(definition.paths),
        `${routeId} has an unreachable physical route`,
      ).toContain(definition.internal);
    }
  });

  it("serves every workspace route from an English physical path", () => {
    for (const routeId of platformRouteIds()) {
      if (!routeId.startsWith("workspace.")) continue;
      const definition = routeDefinition(routeId);
      expect(definition.paths.en).toBe(definition.internal);
    }
  });

  it("does not change a single live Serbian URL", () => {
    // The regression guard for the physical move: these are the URLs the only
    // organization's users have in their address bars, bookmarks and email
    // links. Written out rather than derived — a derived expectation would move
    // with the bug it is supposed to catch.
    const liveSerbianUrls: Record<string, string> = {
      "workspace.home": "/radni-prostor",
      "workspace.appointments.list": "/radni-prostor/termini",
      "workspace.clients.list": "/radni-prostor/klijenti",
      "workspace.companies.list": "/radni-prostor/kompanije",
      "workspace.services.list": "/radni-prostor/usluge",
      "workspace.research": "/radni-prostor/istrazivanja",
      "workspace.documents": "/radni-prostor/dokumenti",
      "workspace.content.list": "/radni-prostor/sadrzaj",
      "workspace.content.review":
        "/radni-prostor/sadrzaj/[entryId]/revizije/[revisionId]/pregled",
      "workspace.compass.home": "/radni-prostor/kompas",
      "workspace.compass.content.list": "/radni-prostor/kompas/sadrzaj",
      "workspace.compass.content.new": "/radni-prostor/kompas/sadrzaj/novo",
      "workspace.compass.content.detail":
        "/radni-prostor/kompas/sadrzaj/[entryId]",
      "workspace.therapists.list": "/radni-prostor/terapeuti",
      "workspace.profile": "/radni-prostor/profil",
      "workspace.settings.home": "/radni-prostor/podesavanja",
      "account.home": "/nalog",
      "account.appointments": "/nalog/termini",
      "account.settings": "/nalog/podesavanja",
    };

    for (const [routeId, expected] of Object.entries(liveSerbianUrls)) {
      expect(
        routeDefinition(routeId as never).paths["sr-Latn"],
        `${routeId} changed a live URL`,
      ).toBe(expected);
    }
  });

  it("retires /dostupnost through an alias rather than a broken link", () => {
    // The one deliberate URL change. `/raspored` is canonical; the old path
    // must still resolve, or every bookmark and email link to it 404s.
    expect(routeDefinition("workspace.schedule").paths["sr-Latn"]).toBe(
      "/radni-prostor/raspored",
    );
    expect(ROUTE_ALIASES["/radni-prostor/dostupnost"]).toBe(
      "workspace.schedule",
    );
  });

  it("records public routes without activating them", () => {
    // Public paths move canonical URLs, the sitemap and redirect history, so
    // they are a separate SEO slice. Serbian values must stay the live ones.
    expect(PUBLIC_ROUTES["public.team.list"]["sr-Latn"]).toBe("/tim");
    expect(PUBLIC_ROUTES["public.book"]["sr-Latn"]).toBe("/zakazi");
    for (const template of Object.values(PUBLIC_ROUTES)) {
      expect(FILESYSTEM_ROUTES).toContain(template["sr-Latn"]);
    }
  });
});

describe("localizedPath", () => {
  it("builds both locales for the same screen", () => {
    expect(
      localizedPath("workspace.settings.home", { locale: "sr-Latn" }),
    ).toBe("/radni-prostor/podesavanja");
    expect(localizedPath("workspace.settings.home", { locale: "en" })).toBe(
      "/workspace/settings",
    );
  });

  it("substitutes and encodes dynamic params", () => {
    expect(
      localizedPath("workspace.compass.content.detail", {
        locale: "sr-Latn",
        params: { entryId: "a b/c" },
      }),
    ).toBe("/radni-prostor/kompas/sadrzaj/a%20b%2Fc");
  });

  it("keeps the tab code identical across locales", () => {
    // Query parameters are never translated — the same `?tab=` value must
    // address the same screen state in both languages.
    const en = localizedPath("workspace.profile", {
      locale: "en",
      tab: "matching",
    });
    const sr = localizedPath("workspace.profile", {
      locale: "sr-Latn",
      tab: "matching",
    });
    expect(en).toBe("/workspace/profile?tab=matching");
    expect(sr).toBe("/radni-prostor/profil?tab=matching");
  });

  it("throws instead of rendering a link with a missing parameter", () => {
    expect(() =>
      localizedPath("workspace.content.review", {
        locale: "sr-Latn",
        params: { entryId: "e1", revisionId: "" },
      }),
    ).toThrow(/revisionId/);
  });

  it("builds the physical path separately from the external one", () => {
    // What the proxy rewrites *to* versus what the browser shows.
    expect(internalPath("workspace.schedule", {})).toBe("/workspace/schedule");
    expect(localizedPath("workspace.schedule", { locale: "sr-Latn" })).toBe(
      "/radni-prostor/raspored",
    );
  });
});

describe("matchPlatformPath", () => {
  it("round-trips every route in every locale", () => {
    // The invariant the 308 redirect depends on. If `localizedPath` and
    // `matchPlatformPath` disagree by one character, the canonical redirect
    // fires forever.
    for (const routeId of platformRouteIds()) {
      const definition = routeDefinition(routeId);
      const params = Object.fromEntries(
        (definition.params ?? []).map((name) => [name, `${name}-value`]),
      );
      for (const locale of SUPPORTED_UI_LOCALES) {
        const path = localizedPath(routeId, {
          locale,
          ...(definition.params ? { params } : {}),
        } as never);
        const match = matchPlatformPath(path);

        expect(match, `${routeId} @ ${locale} → ${path}`).not.toBeNull();
        expect(match?.routeId).toBe(routeId);
        expect(match?.params).toEqual(params);
        // A locale-neutral route legitimately matches either locale's shape.
        if (!("localeNeutral" in definition)) {
          expect(match?.pathLocale).toBe(locale);
        }
      }
    }
  });

  it("prefers a static segment over a dynamic one", () => {
    expect(
      matchPlatformPath("/radni-prostor/kompas/sadrzaj/novo")?.routeId,
    ).toBe("workspace.compass.content.new");
    expect(
      matchPlatformPath("/radni-prostor/kompas/sadrzaj/abc")?.routeId,
    ).toBe("workspace.compass.content.detail");
  });

  it("normalizes a trailing slash before matching", () => {
    expect(normalizePathname("/radni-prostor/termini/")).toBe(
      "/radni-prostor/termini",
    );
    expect(matchPlatformPath("/radni-prostor/termini/")?.routeId).toBe(
      "workspace.appointments.list",
    );
  });

  it("returns null for unregistered and API paths", () => {
    expect(matchPlatformPath("/api/booking/slots")).toBeNull();
    expect(matchPlatformPath("/tim/maria-bullock")).toBeNull();
    expect(matchPlatformPath("/nepostojece")).toBeNull();
  });
});

describe("isRouteActive", () => {
  /**
   * The helper this replaces, verbatim from
   * `features/workspace/components/sidebar.tsx` before ROUTE-I18N-1 — it was
   * copy-pasted byte-identically into four components. Kept here as the oracle:
   * "zero behaviour change" is only a claim until the replacement is diffed
   * against the thing it replaced, and a nav item that quietly stops lighting
   * is exactly the regression nobody files a bug for.
   */
  function originalIsActive(pathname: string, href: string): boolean {
    if (href === "/radni-prostor") return pathname === "/radni-prostor";
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  const livePaths = [
    "/radni-prostor",
    "/radni-prostor/termini",
    "/radni-prostor/klijenti",
    "/radni-prostor/kompanije",
    "/radni-prostor/usluge",
    "/radni-prostor/istrazivanja",
    "/radni-prostor/dokumenti",
    "/radni-prostor/sadrzaj",
    "/radni-prostor/sadrzaj/e1/revizije/r1/pregled",
    "/radni-prostor/kompas",
    "/radni-prostor/kompas/sadrzaj",
    "/radni-prostor/kompas/sadrzaj/novo",
    "/radni-prostor/kompas/sadrzaj/abc",
    "/radni-prostor/terapeuti",
    "/radni-prostor/profil",
    "/radni-prostor/podesavanja",
  ];

  it("matches the original implementation on every live Serbian path", () => {
    for (const pathname of livePaths) {
      for (const routeId of platformRouteIds()) {
        const definition = routeDefinition(routeId);
        const href = definition.paths["sr-Latn"];
        if (!href.startsWith("/radni-prostor")) continue;
        // `workspace.schedule` is the one route whose Serbian path is changing,
        // so it has no "original" to be compared against.
        if (routeId === "workspace.schedule") continue;
        // The original helper only ever received concrete nav hrefs. A dynamic
        // template like `.../[entryId]/...` was never passed to it, so there is
        // no original behaviour to preserve — comparing against the raw
        // template would assert that today's code is wrong.
        if (definition.params) continue;
        expect(
          isRouteActive(pathname, routeId),
          `${pathname} vs ${routeId}`,
        ).toBe(originalIsActive(pathname, href));
      }
    }
  });

  it("keeps a section root lit for its children", () => {
    expect(
      isRouteActive(
        "/radni-prostor/kompas/sadrzaj/abc",
        "workspace.compass.home",
      ),
    ).toBe(true);
    expect(
      isRouteActive(
        "/radni-prostor/sadrzaj/e1/revizije/r1/pregled",
        "workspace.content.list",
      ),
    ).toBe(true);
  });

  it("does not light an exact-match root from a child path", () => {
    // Replaces the hardcoded `if (href === "/radni-prostor")` special case that
    // was copy-pasted into four components.
    expect(isRouteActive("/radni-prostor/termini", "workspace.home")).toBe(
      false,
    );
    expect(isRouteActive("/radni-prostor", "workspace.home")).toBe(true);
    expect(isRouteActive("/superadmin/tenants", "superadmin.home")).toBe(false);
  });

  it("lights the same item from either locale's path", () => {
    // The property the four string-comparing copies could never have.
    for (const path of ["/workspace/clients", "/radni-prostor/klijenti"]) {
      expect(isRouteActive(path, "workspace.clients.list")).toBe(true);
    }
  });
});

describe("derived surfaces", () => {
  it("covers every protected route's every locale path with a prefix", () => {
    // Risk 1: the only failure here with a security consequence.
    const prefixes = protectedRoutePrefixes();
    for (const routeId of platformRouteIds()) {
      const definition = routeDefinition(routeId);
      if (!("protected" in definition)) continue;
      for (const path of Object.values(definition.paths)) {
        expect(
          prefixes.some((p) => path === p || path.startsWith(`${p}/`)),
          `${path} is not behind any prefix`,
        ).toBe(true);
      }
    }
  });

  it("still covers today's live prefixes", () => {
    expect(protectedRoutePrefixes()).toEqual(
      expect.arrayContaining(["/nalog", "/radni-prostor", "/superadmin"]),
    );
  });

  it("exposes every platform root segment for the reserved-slug list", () => {
    // Risk 5: a CMS document slugged `workspace` is shadowed by the static
    // route and 404s forever with no error anywhere.
    expect(platformRootSegments()).toEqual(
      expect.arrayContaining([
        "account",
        "nalog",
        "radni-prostor",
        "superadmin",
        "workspace",
      ]),
    );
  });
});

describe("PLATFORM_ROUTES shape", () => {
  it("is non-empty and every id is namespaced", () => {
    expect(platformRouteIds().length).toBeGreaterThan(0);
    for (const routeId of platformRouteIds()) {
      expect(routeId).toMatch(/^(workspace|account|superadmin)\./);
    }
    expect(Object.keys(PLATFORM_ROUTES)).toEqual(platformRouteIds());
  });
});
