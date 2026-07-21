import { formatRsd, serviceCatalog } from "@/content/services";

export type HomepageOfferKind = "service" | "audience" | "program";

export interface HomepageOfferCard {
  id: string;
  kind: HomepageOfferKind;
  title: string;
  description: string;
  durationLabel: string;
  priceLabel: string;
  formatLabel: string;
  detailsHref: string;
  bookingHref?: string;
  relatedHref?: string;
  badge?: string;
  featured?: boolean;
  status: "active" | "coming-soon";
}

/**
 * Presentation data for the homepage services section. Canonical service facts
 * are read from `services.ts`; this only adds layout and route intent.
 */
export const homepageOfferCards: HomepageOfferCard[] = [
  ...serviceCatalog.map((service) => ({
    id: service.slug,
    kind: "service" as const,
    title: service.name,
    description: service.description,
    durationLabel: service.duration,
    priceLabel: formatRsd(service.priceAmount),
    formatLabel: service.format,
    detailsHref: `/usluge/${service.slug}`,
    bookingHref: `/zakazi?service=${service.slug}&source=homepage`,
    ...(service.slug === "individualna-psihoterapija"
      ? { badge: "Najčešći izbor", featured: true }
      : {}),
    ...(service.slug === "roditeljsko-savetovanje"
      ? { relatedHref: "/podrska-roditeljima" }
      : {}),
    status: "active" as const,
  })),
  {
    id: "adolescenti",
    kind: "audience",
    title: "Adolescenti",
    description: "Individualni rad prilagođen mladima i njihovom tempu.",
    durationLabel: "Trajanje se potvrđuje",
    priceLabel: "Cena se potvrđuje",
    formatLabel: "Prema terapeutu",
    detailsHref: "/tim",
    status: "coming-soon",
  },
  {
    id: "radionice",
    kind: "program",
    title: "Radionice",
    description: "Grupna iskustvena učenja kroz geštalt pristup.",
    durationLabel: "Prema programu",
    priceLabel: "Cena uz svaki program",
    formatLabel: "Online ili uživo",
    detailsHref: "/radionice",
    status: "active",
  },
];
