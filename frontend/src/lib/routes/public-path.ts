import type { Route } from "next";

import { SUPPORTED_UI_LOCALES, type UiLocale } from "@/i18n/locales";
import {
  PUBLIC_ROUTES,
  type PublicRouteId,
} from "@/lib/routes/platform-routes";
import { normalizePathname } from "@/lib/routes/match";

type ParamNames<Path extends string> =
  Path extends `${string}[${infer Param}]${infer Rest}`
    ? Param | ParamNames<Rest>
    : never;

type ParamsArg<Id extends PublicRouteId> =
  ParamNames<(typeof PUBLIC_ROUTES)[Id]["en"]> extends never
    ? { params?: never }
    : {
        params: Record<ParamNames<(typeof PUBLIC_ROUTES)[Id]["en"]>, string>;
      };

export type PublicPathOptions<Id extends PublicRouteId> = {
  locale: UiLocale;
  query?: Record<string, string | undefined>;
} & ParamsArg<Id>;

export interface PublicPathMatch {
  routeId: PublicRouteId;
  params: Record<string, string>;
  pathLocale: UiLocale;
}

function substitute(
  template: string,
  params: Record<string, string> | undefined,
  routeId: string,
): string {
  return template.replace(/\[([^\]]+)\]/g, (_match, name: string) => {
    const value = params?.[name];
    if (!value) {
      throw new Error(`Public route "${routeId}" requires "${name}".`);
    }
    return encodeURIComponent(value);
  });
}

function withQuery(
  path: string,
  query: Record<string, string | undefined> | undefined,
): Route {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined) search.set(key, value);
  }
  const rendered = search.toString();
  return `${path}${rendered ? `?${rendered}` : ""}` as Route;
}

/** Locale-aware external URL shown in public navigation and CTAs. */
export function localizedPublicPath<Id extends PublicRouteId>(
  routeId: Id,
  options: PublicPathOptions<Id>,
): Route {
  return withQuery(
    substitute(PUBLIC_ROUTES[routeId][options.locale], options.params, routeId),
    options.query,
  );
}

/** Physical Next route. Public pages currently live at the Serbian path. */
export function internalPublicPath(
  routeId: PublicRouteId,
  params: Record<string, string>,
): string {
  return substitute(PUBLIC_ROUTES[routeId]["sr-Latn"], params, routeId);
}

interface CompiledPublicRoute {
  routeId: PublicRouteId;
  locale: UiLocale;
  segments: readonly string[];
  staticCount: number;
}

const COMPILED_PUBLIC_ROUTES = (Object.keys(PUBLIC_ROUTES) as PublicRouteId[])
  .flatMap((routeId) =>
    SUPPORTED_UI_LOCALES.map((locale) => {
      const segments = PUBLIC_ROUTES[routeId][locale]
        .split("/")
        .filter(Boolean);
      return {
        routeId,
        locale,
        segments,
        staticCount: segments.filter((segment) => !segment.startsWith("["))
          .length,
      } satisfies CompiledPublicRoute;
    }),
  )
  .sort(
    (left, right) =>
      right.segments.length - left.segments.length ||
      right.staticCount - left.staticCount,
  );

export function matchPublicPath(pathname: string): PublicPathMatch | null {
  const segments = normalizePathname(pathname).split("/").filter(Boolean);
  for (const route of COMPILED_PUBLIC_ROUTES) {
    if (route.segments.length !== segments.length) continue;
    const params: Record<string, string> = {};
    let matched = true;
    route.segments.forEach((pattern, index) => {
      const actual = segments[index] ?? "";
      if (pattern.startsWith("[") && pattern.endsWith("]")) {
        if (!actual) matched = false;
        else params[pattern.slice(1, -1)] = decodeURIComponent(actual);
      } else if (pattern !== actual) matched = false;
    });
    if (matched) {
      return { routeId: route.routeId, params, pathLocale: route.locale };
    }
  }
  return null;
}

/** Translate a registered public href while preserving stable query values. */
export function localizePublicHref(href: string, locale: UiLocale): Route {
  const base = "https://public-route.local";
  const url = new URL(href, base);
  if (url.origin !== base) return href as Route;
  const match = matchPublicPath(url.pathname);
  if (!match) return href as Route;
  return localizedPublicPath(match.routeId, {
    locale,
    ...(Object.keys(match.params).length > 0 ? { params: match.params } : {}),
    query: Object.fromEntries(url.searchParams),
  } as never);
}
