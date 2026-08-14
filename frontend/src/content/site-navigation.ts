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
  href: string;
}> = [
  { key: "support", href: "/pronadji-podrsku" },
  { key: "therapists", href: "/tim" },
  { key: "services", href: "/usluge" },
  { key: "workshops", href: "/radionice" },
  { key: "knowledge", href: "/znanje" },
  { key: "compass", href: "/kompas" },
  { key: "about", href: "/o-nama" },
];

/** System navigation wording comes from the active UI locale catalogue. */
export function visibleHeaderNavLinks(
  compassEnabled: boolean,
  label: LabelResolver,
): SiteNavLink[] {
  return HEADER_NAV_ITEMS.filter(
    (item) => compassEnabled || item.key !== "compass",
  ).map((item) => ({ label: label(item.key), href: item.href }));
}

export const headerBookingHref = "/zakazi?source=header";

export interface FooterNavigationGroup {
  title: string;
  links: SiteNavLink[];
}

export function footerNavigationGroups(
  label: LabelResolver,
  groupTitles: { support: string; organization: string },
): FooterNavigationGroup[] {
  return [
    {
      title: groupTitles.support,
      links: [
        { label: label("support"), href: "/pronadji-podrsku" },
        { label: label("services"), href: "/usluge" },
        { label: label("parents"), href: "/podrska-roditeljima" },
        { label: label("workshops"), href: "/radionice" },
        { label: label("prices"), href: "/cene" },
      ],
    },
    {
      title: groupTitles.organization,
      links: [
        { label: label("team"), href: "/tim" },
        { label: label("about"), href: "/o-nama" },
        { label: label("knowledge"), href: "/znanje" },
        { label: label("companies"), href: "/rad-sa-kompanijama" },
        { label: label("contact"), href: "/kontakt" },
      ],
    },
  ];
}
