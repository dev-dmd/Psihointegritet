import { pickContent } from "@/content/locale";
import { headerNavLinks, type SiteNavLink } from "@/content/site-navigation";

import * as en from "./en/homepage";
import * as srLatn from "./sr-Latn/homepage";

/**
 * Typed staging content for the public homepage, extracted from the Claude
 * Design handoff. Ekavica is the site-wide default (T9), now without exception:
 * the ijekavica carve-out under D-017 was personal to Anja Stamenković and left
 * with the 2026-08-10 team replacement (D-074). Therapists' personal voice
 * (quotes/bio) still lives in `content/therapists.ts`, not here. Replaced by
 * CMS/backend data in later milestones.
 */

export type NavLink = SiteNavLink;

export type TrustIcon = "screen" | "pin" | "people" | "shield";

export interface TrustItem {
  icon: TrustIcon;
  label: string;
}

export interface CompaniesContent {
  eyebrow: string;
  title: string;
  description: string;
  action: { label: string; href: string };
}

export interface ClientLink {
  prefix: string;
  label: string;
  href: string;
}

export interface ReasonCard {
  number: string;
  title: string;
  description: string;
  href: string;
}

export interface FirstSessionStep {
  number: string;
  title: string;
  description: string;
}

export interface WorkshopFact {
  label: string;
  value: string;
}

export interface ResourceArticle {
  category: string;
  title: string;
  description: string;
}

export interface FaqItem {
  id: string;
  question: string;
  answer: string;
}

/**
 * Absolute hrefs, not bare anchors: the header and footer now render on every
 * public page (see app/(public)/layout.tsx), so „#usluge" alone would be dead
 * everywhere except the homepage.
 */
export const navLinks: NavLink[] = headerNavLinks;

/**
 * Homepage copy in the deployment's content locale.
 *
 * Every consumer keeps importing `@/content/homepage`; only this file knows
 * there are two. The two are not translations of each other — Serbian is the
 * tenant's own text, English a placeholder. `href` values and ids are identical
 * in both, because they address routes rather than saying anything.
 */
const copy = pickContent({ en, "sr-Latn": srLatn });

export const companies = copy.companies;
export const clientLink = copy.clientLink;
export const footerServiceLinks = copy.footerServiceLinks;
export const trustItems = copy.trustItems;
export const reasons = copy.reasons;
export const firstSessionSteps = copy.firstSessionSteps;
export const workshopFacts = copy.workshopFacts;
export const resources = copy.resources;
export const faqItems = copy.faqItems;
