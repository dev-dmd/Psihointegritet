/**
 * Every refusal, said in the panel's language, with the next action.
 *
 * Before this, a therapist could meet: an untranslated pydantic sentence
 * ("Value error, ID koristi mala slova…"), a raw HTTP status, a correlation id
 * as the headline — or nothing at all, because an unrecognised `fieldPath` was
 * stored under a key no input renders while it cleared the banner on its way.
 *
 * The rule (D-062): say what is not finished, why it matters, and what to do
 * next. Technical codes and identifiers are never rendered to tenant users.
 */

import { TaxonomyApiError } from "../../taxonomy-api";

export interface TaxonomyErrorCopy {
  /** One sentence naming what happened, in the user's terms. */
  message: string;
  /** What they can do right now. Empty when the action is "try again". */
  nextAction: string;
  /** Reserved for superadmin-only diagnostics; null on tenant surfaces. */
  supportDetail: string | null;
}

const BY_CODE: Record<string, TaxonomyErrorCopy> = {
  taxonomy_stable_id_conflict: {
    message: "Stavka sa ovim nazivom već postoji u registru.",
    nextAction:
      "Otvorite postojeću stavku ili promenite naziv tako da se jasno razlikuje.",
    supportDetail: null,
  },
  "TAX-AUTH-001": {
    message: "Nemate dozvolu da menjate ovu stavku.",
    nextAction: "Obratite se administratoru organizacije.",
    supportDetail: null,
  },
  "TAX-SYSTEM-001": {
    message: "Ova vrednost je sistemska i ne može se menjati.",
    nextAction:
      "Sistemske vrednosti održava tehnički tim; napravite novu stavku umesto izmene ove.",
    supportDetail: null,
  },
};

const NETWORK_COPY: TaxonomyErrorCopy = {
  message: "Izmena trenutno nije sačuvana. Vaš tekst je ostao na ekranu.",
  nextAction: "Proverite vezu i pokušajte ponovo.",
  supportDetail: null,
};

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

export function taxonomyErrorCopy(error: unknown): TaxonomyErrorCopy {
  if (!(error instanceof TaxonomyApiError)) return NETWORK_COPY;

  const known = error.problem?.code ? BY_CODE[error.problem.code] : undefined;
  if (known) return { ...known, supportDetail: null };

  if (error.status >= 500) {
    return {
      message: "Nešto nije uspelo na serveru.",
      nextAction: "Pokušajte ponovo za nekoliko minuta.",
      supportDetail: null,
    };
  }

  return {
    message: "Izmena nije sačuvana.",
    nextAction: "Proverite unos i pokušajte ponovo.",
    supportDetail: null,
  };
}
