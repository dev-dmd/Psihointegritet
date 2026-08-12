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

import { pickContent } from "@/content/locale";

import * as en from "./en/services";
import * as srLatn from "./sr-Latn/services";

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

/**
 * The catalogue in the deployment's content locale.
 *
 * Every consumer keeps importing `@/content/services`; only this file knows
 * there are two. The two are not translations of each other — Serbian is the
 * tenant's own text, English a placeholder showing what each field is for.
 */
const catalogue = pickContent({ en, "sr-Latn": srLatn });

export const serviceCatalog = catalogue.serviceCatalog;
export const PRICE_NOTE = catalogue.PRICE_NOTE;
export const sessionPackages = catalogue.sessionPackages;
export const supportAreas = catalogue.supportAreas;

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
