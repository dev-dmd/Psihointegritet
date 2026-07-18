/**
 * Canonical service catalog for the /usluge page.
 *
 * Prices are the draft T7 values and must always be presented as „okvirne"
 * (see PRICE_NOTE). Names are fixed by T1 („Bračno savetovanje") and T2
 * („Psihoterapijsko savetovanje"). Replaced by DB-backed content in R2.
 *
 * NOTE (drift risk): the homepage `Services` section still renders the same
 * three prices from `featuredService`/`midServices` in `content/homepage.ts`.
 * Both trace to T7; the homepage copy is slated to migrate to this catalog
 * (and later to the backend) — until then, any price change touches both.
 */

export interface ServiceCatalogItem {
  slug: string;
  name: string;
  description: string;
  duration: string;
  price: string;
  format: string;
}

export const serviceCatalog: ServiceCatalogItem[] = [
  {
    slug: "individualna-psihoterapija",
    name: "Individualna psihoterapija",
    description:
      "Prostor u kojem u svom tempu istražujete ono što vas opterećuje — uz podršku terapeuta i geštalt pristup koji podstiče svesnost, autentičnost i odgovornost za vlastiti život.",
    duration: "60 minuta",
    price: "3.500 RSD",
    format: "online ili uživo",
  },
  {
    slug: "bracno-savetovanje",
    name: "Bračno savetovanje",
    description:
      "Zajednički rad na komunikaciji, bliskosti i obrascima koji se ponavljaju u odnosu.",
    duration: "90 minuta",
    price: "5.000 RSD",
    format: "online ili uživo",
  },
  {
    slug: "psihoterapijsko-savetovanje",
    name: "Psihoterapijsko savetovanje",
    description:
      "Fokusirana podrška u konkretnim životnim situacijama i odlukama.",
    duration: "60 minuta",
    price: "3.500 RSD",
    format: "online ili uživo",
  },
];

/** Mandatory price disclaimer (T7). */
export const PRICE_NOTE =
  "Cene su okvirne i služe kao orijentacija. Tačan dogovor o terminu i uslovima pravite direktno sa terapeutom.";

export interface SupportArea {
  title: string;
  description: string;
  href: string;
}

/** Additional support pathways without a fixed per-session price. */
export const supportAreas: SupportArea[] = [
  {
    title: "Podrška adolescentima",
    description:
      "Individualni rad prilagođen mladima i njihovom tempu, uz dogovor sa roditeljem ili starateljem.",
    href: "/tim",
  },
  {
    title: "Podrška roditeljima",
    description:
      "Savetodavna podrška roditeljima u izazovima roditeljske uloge, u svim fazama.",
    href: "/tim",
  },
  {
    title: "Radionice",
    description:
      "Grupna iskustvena učenja kroz geštalt pristup — najave i prijava interesovanja.",
    href: "/#radionice",
  },
];
