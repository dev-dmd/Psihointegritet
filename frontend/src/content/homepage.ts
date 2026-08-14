/**
 * Typed staging content for the public homepage, extracted from the Claude
 * Design handoff. Ekavica is the site-wide default (T9), now without exception:
 * the ijekavica carve-out under D-017 was personal to Anja Stamenković and left
 * with the 2026-08-10 team replacement (D-074). Therapists' personal voice
 * (quotes/bio) lives in the `content/en` and `content/sr-Latn` packages until
 * CMS/backend data replaces the fallback in a later milestone.
 */

export interface NavLink {
  label: string;
  href: string;
}

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
