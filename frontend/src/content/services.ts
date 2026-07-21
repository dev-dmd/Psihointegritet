/**
 * Canonical service catalog, session packages and group programs.
 *
 * Prices and structure come from Anja's answers
 * (documentations/odgovor-za-matching-anketa.pdf, 2026-07-18) and supersede
 * the earlier T7 draft prices. Names follow T1 („Bračno savetovanje") and T2
 * (never „psihološko savetovanje"). Everything is still presented as
 * indicative (PRICE_NOTE) until final confirmation. R2 adds operational
 * booking mappings; R3 later replaces this public catalog with CMS-backed content.
 */

export { formatRsd } from "@/content/currency";

export interface ServiceCatalogItem {
  slug: string;
  name: string;
  description: string;
  duration: string;
  priceAmount: number;
  format: string;
  audience: string;
  firstStep: string;
}

export const serviceCatalog: ServiceCatalogItem[] = [
  {
    slug: "individualna-psihoterapija",
    name: "Individualna psihoterapija",
    description:
      "Prostor u kojem u svom tempu istražujete ono što vas opterećuje — uz podršku terapeuta i geštalt pristup koji podstiče svesnost, autentičnost i odgovornost za vlastiti život.",
    duration: "60 minuta",
    priceAmount: 4000,
    format: "online ili uživo",
    audience:
      "Za osobe koje žele da uz podršku terapeuta istraže ono što ih opterećuje.",
    firstStep:
      "Pošaljite zahtev za termin, a zatim sa terapeutom dogovorite prvi razgovor.",
  },
  {
    slug: "bracno-savetovanje",
    name: "Bračno savetovanje",
    description:
      "Zajednički rad na komunikaciji, bliskosti i obrascima koji se ponavljaju u odnosu.",
    duration: "90 minuta",
    priceAmount: 5500,
    format: "online ili uživo",
    audience:
      "Za parove koji žele da rade na komunikaciji, bliskosti i obrascima u odnosu.",
    firstStep:
      "Pošaljite zajednički zahtev za termin, pa sa terapeutom dogovorite prvi razgovor.",
  },
  {
    slug: "roditeljsko-savetovanje",
    name: "Roditeljsko savetovanje",
    description:
      "Savetodavna podrška roditeljima u razumevanju deteta i jačanju odnosa, u svim uzrastima.",
    duration: "60 minuta",
    priceAmount: 5000,
    format: "online ili uživo",
    audience:
      "Za roditelje koji žele podršku u razumevanju deteta i jačanju odnosa.",
    firstStep:
      "Pošaljite zahtev za termin, a zatim sa terapeutom dogovorite prvi razgovor.",
  },
];

/** Mandatory price disclaimer (T7). */
export const PRICE_NOTE =
  "Cene su okvirne i služe kao orijentacija. Tačan dogovor o terminu i uslovima pravite direktno sa terapeutom.";

// --- Paketi individualnog rada -------------------------------------------

export interface SessionPackage {
  sessions: number;
  deadline: string;
  priceAmount: number;
  /** Regular price (sessions × single price) — rendered struck through. */
  fullPriceAmount?: number;
}

/**
 * Packages of individual sessions, for clients who want continuity. The
 * 5-session package is a deliberate discount: the regular 20.000 (5 × 4.000)
 * is shown struck through next to the bold 15.000 (CTO, 2026-07-20).
 */
export const sessionPackages: SessionPackage[] = [
  {
    sessions: 5,
    deadline: "rok realizacije 3 meseca",
    priceAmount: 15000,
    fullPriceAmount: 20000,
  },
  { sessions: 10, deadline: "rok realizacije 5 meseci", priceAmount: 38000 },
];

// --- Ostale oblasti podrške ----------------------------------------------

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
    href: "/podrska-roditeljima",
  },
  {
    title: "Radionice",
    description:
      "Grupna iskustvena učenja kroz geštalt pristup — najave i prijava interesovanja.",
    href: "/radionice",
  },
];

export function findService(slug: string): ServiceCatalogItem | undefined {
  return serviceCatalog.find((service) => service.slug === slug);
}

export function serviceSlugForName(name: string): string | undefined {
  return serviceCatalog.find((service) => service.name === name)?.slug;
}

/** Backwards-compatible export while consumers move to `content/programs`. */
export {
  GROUP_PRICE_PENDING,
  groupPrograms,
  type GroupProgram,
} from "@/content/programs";
