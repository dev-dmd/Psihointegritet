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

// --- Ostale oblasti podrške ----------------------------------------------

export interface SupportArea {
  title: string;
  description: string;
  href: string;
}

/** Additional support pathways without a fixed per-session price. */

/** Backwards-compatible export while consumers move to `content/programs`. */
export {
  GROUP_PRICE_PENDING,
  groupPrograms,
  type GroupProgram,
} from "@/content/programs";
