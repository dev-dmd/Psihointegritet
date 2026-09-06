import type { UiLocale } from "@/i18n/locales";
import { localizedPublicPath } from "@/lib/routes/public-path";
import type { PublicRouteId } from "@/lib/routes/platform-routes";

export interface SiteNavLink {
  label: string;
  href: string;
}

export type SiteNavigationLabelKey =
  | "support"
  | "therapists"
  | "services"
  | "workshops"
  | "knowledge"
  | "compass"
  | "about"
  | "parents"
  | "prices"
  | "team"
  | "companies"
  | "contact";

type LabelResolver = (key: SiteNavigationLabelKey) => string;

const HEADER_NAV_ITEMS: ReadonlyArray<{
  key: SiteNavigationLabelKey;
  routeId: PublicRouteId;
}> = [
  { key: "support", routeId: "public.findSupport" },
  { key: "therapists", routeId: "public.team.list" },
  { key: "services", routeId: "public.services.list" },
  { key: "workshops", routeId: "public.workshops.list" },
  { key: "knowledge", routeId: "public.knowledge" },
  { key: "compass", routeId: "public.compass.home" },
  { key: "about", routeId: "public.about" },
];

/** System navigation wording comes from the active UI locale catalogue. */
export function visibleHeaderNavLinks(
  compassEnabled: boolean,
  label: LabelResolver,
  locale: UiLocale,
): SiteNavLink[] {
  return HEADER_NAV_ITEMS.filter(
    (item) => compassEnabled || item.key !== "compass",
  ).map((item) => ({
    label: label(item.key),
    href: localizedPublicPath(item.routeId, { locale } as never),
  }));
}

export function headerBookingHref(locale: UiLocale): string {
  return localizedPublicPath("public.book", {
    locale,
    query: { source: "header" },
  });
}

export interface FooterNavigationGroup {
  title: string;
  links: SiteNavLink[];
}

export function footerNavigationGroups(
  label: LabelResolver,
  groupTitles: { support: string; organization: string },
  locale: UiLocale,
): FooterNavigationGroup[] {
  const link = (key: SiteNavigationLabelKey, routeId: PublicRouteId) => ({
    label: label(key),
    href: localizedPublicPath(routeId, { locale } as never),
  });
  return [
    {
      title: groupTitles.support,
      links: [
        link("support", "public.findSupport"),
        link("services", "public.services.list"),
        link("parents", "public.parentSupport"),
        link("workshops", "public.workshops.list"),
        link("prices", "public.pricing"),
      ],
    },
    {
      title: groupTitles.organization,
      links: [
        link("team", "public.team.list"),
        link("about", "public.about"),
        link("knowledge", "public.knowledge"),
        link("companies", "public.forCompanies"),
        link("contact", "public.contact"),
      ],
    },
  ];
}
