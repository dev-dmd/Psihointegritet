import { describe, expect, it } from "vitest";

import { SUPPORTED_UI_LOCALES, type UiLocale } from "@/i18n/locales";

import { localizedPath } from "./localized-path";
import { platformRouteIds, routeDefinition } from "./platform-routes";
import { decideProxyRoute, proxyUiLocale } from "./proxy-locale";

describe("proxyUiLocale", () => {
  it("resolves the live tenant to Serbian", () => {
    expect(proxyUiLocale("psihointegritet")).toBe("sr-Latn");
  });

  it("falls back instead of throwing on an unknown or missing slug", () => {
    // Unlike `org-context.ts`, which throws. The proxy runs before any error
    // boundary: throwing here answers every request with a blank 500, including
    // the sign-in page someone would use to go fix the configuration.
    expect(proxyUiLocale(undefined)).toBe("en");
    expect(proxyUiLocale("nepostojeca")).toBe("en");
  });
});

describe("decideProxyRoute", () => {
  const SR: UiLocale = "sr-Latn";

  it("never touches API routes", () => {
    // Rule: API paths are not localized. A 308 here would break every client
    // that posts to them, and the failure would look like a CORS problem.
    for (const path of [
      "/api",
      "/api/booking/slots",
      "/api/content/entries",
      "/api/compass/taxonomy",
    ]) {
      expect(decideProxyRoute(path, "", SR)).toEqual({ kind: "pass" });
      expect(decideProxyRoute(path, "", "en")).toEqual({ kind: "pass" });
    }
  });

  it("never touches auth routes", () => {
    // Clerk holds these paths in its own configuration (D-077 Amendment §10).
    for (const path of ["/prijava", "/prijava/sso-callback", "/registracija"]) {
      expect(decideProxyRoute(path, "", SR)).toEqual({ kind: "pass" });
    }
  });

  it("passes public and unregistered paths through", () => {
    for (const path of [
      "/",
      "/tim/maria-bullock",
      "/kompas/oblasti",
      "/nista",
    ]) {
      expect(decideProxyRoute(path, "", SR)).toEqual({ kind: "pass" });
    }
  });

  it("rewrites a Serbian workspace path onto the English physical route", () => {
    expect(decideProxyRoute("/radni-prostor/podesavanja", "", SR)).toEqual({
      kind: "rewrite",
      internal: "/workspace/settings",
    });
  });

  it("carries dynamic params and query through the rewrite", () => {
    expect(
      decideProxyRoute("/radni-prostor/kompas/sadrzaj/abc", "?tab=content", SR),
    ).toEqual({
      kind: "rewrite",
      internal: "/workspace/compass/content/abc?tab=content",
    });
  });

  it("does not rewrite when the external path is already the physical one", () => {
    // The client panel has not moved: `/nalog` is both external and internal.
    expect(decideProxyRoute("/nalog/termini", "", SR)).toEqual({
      kind: "pass",
    });
  });

  it("308s an English path on a Serbian organization", () => {
    expect(decideProxyRoute("/workspace/settings", "", SR)).toEqual({
      kind: "redirect",
      target: "/radni-prostor/podesavanja",
    });
  });

  it("308s a Serbian path on an English organization", () => {
    expect(decideProxyRoute("/radni-prostor/klijenti", "", "en")).toEqual({
      kind: "redirect",
      target: "/workspace/clients",
    });
  });

  it("preserves params and query across the canonical redirect", () => {
    expect(
      decideProxyRoute("/radni-prostor/usluge", "?tab=pricing", "en"),
    ).toEqual({ kind: "redirect", target: "/workspace/services?tab=pricing" });
  });

  it("redirects the retired /dostupnost alias to the canonical schedule path", () => {
    expect(decideProxyRoute("/radni-prostor/dostupnost", "", SR)).toEqual({
      kind: "redirect",
      target: "/radni-prostor/raspored",
    });
    expect(decideProxyRoute("/workspace/availability", "", SR)).toEqual({
      kind: "redirect",
      target: "/radni-prostor/raspored",
    });
  });

  describe("loop safety", () => {
    it("never redirects the result of its own redirect", () => {
      // The single most important property here. A one-character disagreement
      // between `localizedPath` and `matchPlatformPath` turns the canonical
      // redirect into an infinite bounce that no test of a single hop catches.
      for (const locale of SUPPORTED_UI_LOCALES) {
        for (const routeId of platformRouteIds()) {
          const definition = routeDefinition(routeId);
          const params = Object.fromEntries(
            (definition.params ?? []).map((name) => [name, `${name}-1`]),
          );
          for (const from of SUPPORTED_UI_LOCALES) {
            const path = localizedPath(routeId, {
              locale: from,
              ...(definition.params ? { params } : {}),
            } as never);

            const first = decideProxyRoute(path, "", locale);
            if (first.kind !== "redirect") continue;

            const second = decideProxyRoute(first.target, "", locale);
            expect(
              second.kind,
              `${path} @ ${locale} redirected to ${first.target}, which redirects again`,
            ).not.toBe("redirect");
          }
        }
      }
    });

    it("settles a trailing slash without bouncing", () => {
      const first = decideProxyRoute("/radni-prostor/termini/", "", SR);
      expect(first.kind).toBe("rewrite");
    });

    it("resolves every alias in one hop", () => {
      const alias = decideProxyRoute("/radni-prostor/dostupnost", "", SR);
      expect(alias.kind).toBe("redirect");
      if (alias.kind !== "redirect") return;
      expect(decideProxyRoute(alias.target, "", SR).kind).not.toBe("redirect");
    });
  });
});
