import type { EnErrors } from "@/messages/en/errors";
import type { Widen } from "@/messages/types";

/**
 * Serbian Latin error copy, keyed by backend `ApiProblem.code`.
 *
 * Wording follows D-062: name what did not finish, why it matters and what to
 * do next. Never a raw HTTP status, never a correlation id as the headline, and
 * never an untranslated pydantic sentence.
 */
export const errors: Widen<EnErrors> = {
  generic: {
    message: "Zahtev nije prošao.",
    nextAction: "Proverite vezu i pokušajte ponovo.",
  },
  network: {
    message: "Izmena nije sačuvana. Vaš tekst je ostao na ekranu.",
    nextAction: "Proverite vezu i pokušajte ponovo.",
  },
  notFound: {
    message: "Ova stavka više ne postoji.",
    nextAction: "Vratite se na listu i osvežite je.",
  },
  forbidden: {
    message: "Nemate dozvolu za ovu radnju.",
    nextAction: "Obratite se administratoru organizacije.",
  },
  unknownCode: {
    message: "Došlo je do greške na našoj strani.",
    nextAction: "Pokušajte ponovo, i javite nam kod za podršku ako se ponovi.",
  },
};
