/**
 * Field-specific form guidance. API error presentation is centralized in
 * `lib/errors/user-safe-error.ts`; this file contains no transport mapper.
 */

/**
 * Field-level messages the form shows next to an input. Keyed by the draft
 * field, not by a backend path, so a rename on either side is a compile error
 * rather than a silent blank.
 */
export const TAXONOMY_FIELD_COPY: Record<string, string> = {
  publicLabel: "Unesite naziv koji će posetioci videti.",
  shortDescription:
    "Napišite jednu ili dve rečenice koje će posetioci videti ispod naziva.",
  primaryParentTermId:
    "Izaberite oblast kojoj ova tema pripada. Ako odgovarajuća oblast ne postoji, prvo je kreirajte.",
  journeyIntentTermId: "Izaberite gde ova tema može da vodi korisnika.",
  iconKey: "Izaberite oznaku iz kataloga.",
  canonicalPath:
    "Da bi stavka imala svoju javnu stranicu, potvrdite predloženu adresu.",
};
