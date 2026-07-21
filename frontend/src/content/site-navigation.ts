export interface SiteNavLink {
  label: string;
  href: string;
}

/** The six sticky-header destinations remain deliberately compact. */
export const headerNavLinks: SiteNavLink[] = [
  { label: "Pronađi podršku", href: "/pronadji-podrsku" },
  { label: "Terapeuti", href: "/tim" },
  { label: "Usluge", href: "/usluge" },
  { label: "Radionice", href: "/radionice" },
  { label: "Znanje i resursi", href: "/znanje" },
  { label: "O nama", href: "/o-nama" },
];

export const headerBookingHref = "/zakazi?source=header";

export interface FooterNavigationGroup {
  title: string;
  links: SiteNavLink[];
}

/** Every link below has a public route in this R1 slice. */
export const footerNavigationGroups: FooterNavigationGroup[] = [
  {
    title: "Podrška",
    links: [
      { label: "Pronađi podršku", href: "/pronadji-podrsku" },
      { label: "Usluge", href: "/usluge" },
      { label: "Roditeljska podrška", href: "/podrska-roditeljima" },
      { label: "Radionice", href: "/radionice" },
      { label: "Cene", href: "/cene" },
    ],
  },
  {
    title: "Psihointegritet",
    links: [
      { label: "Tim", href: "/tim" },
      { label: "O nama", href: "/o-nama" },
      { label: "Znanje i resursi", href: "/znanje" },
      { label: "Rad sa kompanijama", href: "/rad-sa-kompanijama" },
      { label: "Kontakt", href: "/kontakt" },
    ],
  },
];
