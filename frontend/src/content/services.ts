/**
 * Canonical service catalog, session packages and group programs.
 *
 * Prices and structure come from Anja's answers
 * (documentations/odgovor-za-matching-anketa.pdf, 2026-07-18) and supersede
 * the earlier T7 draft prices. Names follow T1 („Bračno savetovanje") and T2
 * (never „psihološko savetovanje"). Everything is still presented as
 * indicative (PRICE_NOTE) until final confirmation. Replaced by DB-backed
 * content in R2.
 */

const rsdFormatter = new Intl.NumberFormat("sr-Latn-RS", {
  maximumFractionDigits: 0,
});

/** 4000 → „4.000 RSD" */
export function formatRsd(amount: number): string {
  return `${rsdFormatter.format(amount)} RSD`;
}

export interface ServiceCatalogItem {
  slug: string;
  name: string;
  description: string;
  duration: string;
  priceAmount: number;
  format: string;
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
  },
  {
    slug: "bracno-savetovanje",
    name: "Bračno savetovanje",
    description:
      "Zajednički rad na komunikaciji, bliskosti i obrascima koji se ponavljaju u odnosu.",
    duration: "90 minuta",
    priceAmount: 5500,
    format: "online ili uživo",
  },
  {
    slug: "roditeljsko-savetovanje",
    name: "Roditeljsko savetovanje",
    description:
      "Savetodavna podrška roditeljima u razumevanju deteta i jačanju odnosa, u svim uzrastima.",
    duration: "60 minuta",
    priceAmount: 5000,
    format: "online ili uživo",
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

// --- Grupni programi ------------------------------------------------------

export interface GroupProgram {
  slug: string;
  title: string;
  audience: string;
  sessions: string;
  /** Session length / group size / format — shown when confirmed. */
  details?: string;
  /** Formatted price line, or the „naknadno" note when unconfirmed. */
  priceLine: string;
  /** Extra visible note under the price line. */
  note?: string;
}

export const GROUP_PRICE_PENDING = "Cena će biti objavljena naknadno.";

/**
 * Group programs per Anja's document. Only „Tridesete" has a confirmed price.
 *
 * TODO(Anja): precizirati napomenu uz „Tridesete" — „roditelji imaju mogućnost
 * dolaska po ceni jednog" (da li dvoje roditelja dolazi po ceni jednog
 * učesnika?). Napomena SE prikazuje (CTO, 2026-07-20), formulacija se
 * dopunjuje kad Anja potvrdi.
 */
export const groupPrograms: GroupProgram[] = [
  {
    slug: "postpartalni-period",
    title: "Sigurno kroz postpartalni period",
    audience: "Za žene u trudnoći i majke u prvoj godini nakon porođaja.",
    sessions: "8 susreta · 120 minuta",
    details: "8–12 učesnica · online ili uživo",
    priceLine: GROUP_PRICE_PENDING,
  },
  {
    slug: "roditeljstvo-0-3",
    title: "Roditeljstvo od 0 do 3 godine — Sigurna baza",
    audience: "Za roditelje dece od rođenja do treće godine.",
    sessions: "8 susreta · 120 minuta",
    details: "8–12 učesnika",
    priceLine: GROUP_PRICE_PENDING,
  },
  {
    slug: "roditeljstvo-3-7",
    title: "Roditeljstvo od 3 do 7 godina — Razvoj kroz odnos",
    audience: "Za roditelje predškolske dece.",
    sessions: "8 susreta · 120 minuta",
    details: "8–12 učesnika",
    priceLine: GROUP_PRICE_PENDING,
  },
  {
    slug: "roditeljstvo-7-12",
    title: "Roditeljstvo školskog deteta (7–12 godina)",
    audience: "Za roditelje dece školskog uzrasta.",
    sessions: "8 susreta",
    priceLine: GROUP_PRICE_PENDING,
  },
  {
    slug: "roditelj-tinejdzera",
    title: "Roditelj tinejdžera",
    audience: "Podrška roditeljima adolescenata.",
    sessions: "8 susreta",
    priceLine: GROUP_PRICE_PENDING,
  },
  {
    slug: "razumevanje-anksioznosti",
    title: "Razumevanje anksioznosti",
    audience:
      "Edukativno-iskustveni program za bolje razumevanje anksioznosti.",
    sessions: "8 susreta",
    priceLine: GROUP_PRICE_PENDING,
  },
  {
    slug: "tridesete",
    title: "Tridesete — Vreme promene",
    audience: "Za osobe koje prolaze kroz životnu tranziciju posle tridesete.",
    sessions: "8 susreta · 120 minuta",
    details: "8–12 učesnika · online ili uživo",
    priceLine: `${formatRsd(3500)} po susretu · ${formatRsd(25000)} ceo program`,
    note: "Napomena: roditelji imaju mogućnost dolaska po ceni jednog učesnika.",
  },
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
    href: "/tim",
  },
  {
    title: "Radionice",
    description:
      "Grupna iskustvena učenja kroz geštalt pristup — najave i prijava interesovanja.",
    href: "/#radionice",
  },
];
