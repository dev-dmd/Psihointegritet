import type { Route } from "next";

import type { UiLocale } from "@/i18n/locales";
import {
  PLATFORM_ROUTES,
  type PlatformRouteId,
  routeDefinition,
} from "@/lib/routes/platform-routes";

/**
 * Path construction and reverse matching for the route registry.
 *
 * Every platform URL in the app is built here. The rule enforced by
 * `scripts/check-frontend-architecture.mjs` is that no module outside
 * `src/lib/routes/` may write a platform path as a string literal or cast to
 * `Route` — both were previously scattered across 25 files and ~12 casts, none
 * of which checked anything.
 */

type Definition<Id extends PlatformRouteId> = (typeof PLATFORM_ROUTES)[Id];

/** Required dynamic params for a route, exactly — no more, no fewer. */
export type RouteParams<Id extends PlatformRouteId> =
  Definition<Id> extends { params: readonly (infer P extends string)[] }
    ? Record<P, string>
    : never;

/** Allowed `?tab=` values for a route. Locale-neutral codes. */
export type RouteTab<Id extends PlatformRouteId> =
  Definition<Id> extends { tabs: readonly (infer T extends string)[] }
    ? T
    : never;

type ParamsArg<Id extends PlatformRouteId> =
  Definition<Id> extends { params: readonly string[] }
    ? { params: RouteParams<Id> }
    : { params?: never };

type TabArg<Id extends PlatformRouteId> =
  Definition<Id> extends { tabs: readonly string[] }
    ? { tab?: RouteTab<Id> }
    : { tab?: never };

export type LocalizedPathOptions<Id extends PlatformRouteId> = {
  locale: UiLocale;
  /** Extra query values. Keys and values are never translated. */
  query?: Record<string, string | undefined>;
} & ParamsArg<Id> &
  TabArg<Id>;

function substitute(
  template: string,
  params: Record<string, string> | undefined,
  routeId: string,
): string {
  return template.replace(/\[([^\]]+)\]/g, (_match, name: string) => {
    const value = params?.[name];
    if (value === undefined || value === "") {
      // Louder than rendering `/clients/undefined`, which looks like a working
      // link until someone clicks it.
      throw new Error(`Route "${routeId}" requires the "${name}" parameter.`);
    }
    return encodeURIComponent(value);
  });
}

function queryString(
  tab: string | undefined,
  query: Record<string, string | undefined> | undefined,
): string {
  const search = new URLSearchParams();
  if (tab !== undefined) search.set("tab", tab);
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined) search.set(key, value);
  }
  const rendered = search.toString();
  return rendered ? `?${rendered}` : "";
}

/**
 * The external URL for a route in a given locale — what the browser shows.
 *
 * The single `as Route` cast in the codebase lives here. It is safe because
 * `typedRoutes` only knows the physical filesystem routes, while a localized
 * external path is served through the proxy rewrite (ROUTE-I18N-4) and so is
 * invisible to that union by construction. `platform-routes.test.ts` asserts
 * every `internal` template against the filesystem, which is the guarantee the
 * type system cannot give for dynamic routes.
 */
export function localizedPath<Id extends PlatformRouteId>(
  routeId: Id,
  options: LocalizedPathOptions<Id>,
): Route {
  const definition = routeDefinition(routeId);
  const template = definition.paths[options.locale];
  const path = substitute(template, options.params, routeId);
  return `${path}${queryString(options.tab, options.query)}` as Route;
}

/**
 * The physical Next.js path — the rewrite target, never a link href.
 *
 * Only the proxy and server-side redirects use this. Rendering it in the UI
 * would leak `/workspace/...` into a Serbian user's address bar.
 */
export function internalPath<Id extends PlatformRouteId>(
  routeId: Id,
  options: Omit<LocalizedPathOptions<Id>, "locale">,
): string {
  const definition = routeDefinition(routeId);
  const path = substitute(definition.internal, options.params, routeId);
  return `${path}${queryString(options.tab, options.query)}`;
}
