import { pickContent } from "@/content/locale";
import type { Therapist } from "@/types/therapist";

import { therapists as en } from "./en/therapists";
import { therapists as srLatn } from "./sr-Latn/therapists";

/**
 * Therapist fallback catalogue — the locale-neutral entry point.
 *
 * All 20-odd readers keep importing `@/content/therapists`; only this file
 * knows there are two of them. See `content/locale.ts` for why the choice is a
 * build-time constant rather than a request-time one.
 *
 * The two files are **not translations of each other**. Serbian is the tenant's
 * own text; English is a placeholder that shows an administrator what each
 * field is for, at the length the design expects. Identity fields — slug, name,
 * image, booking service slugs — are byte-identical in both, because they point
 * at routes and files rather than saying anything.
 */
export const therapists: Therapist[] = pickContent({ en, "sr-Latn": srLatn });

export function findTherapist(slug: string): Therapist | undefined {
  return therapists.find((therapist) => therapist.slug === slug);
}

export function otherTherapists(slug: string): Therapist[] {
  return therapists.filter((therapist) => therapist.slug !== slug);
}
