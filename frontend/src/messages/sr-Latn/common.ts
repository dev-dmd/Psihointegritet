import type { EnCommon } from "@/messages/en/common";
import type { Widen } from "@/messages/types";

/**
 * Serbian Latin, ekavica — the site-wide default (T9).
 *
 * The `Widen<EnCommon>` annotation is what makes this file safe: it fixes the
 * shape against English while leaving every value free. A missing key fails
 * here, an unknown key fails here, and no Serbian value is ever asked to equal
 * an English sentence.
 *
 * Ekavica and ijekavica are **not** separate locales — both are content inside
 * `sr-Latn`, exactly as an author writes them, and nothing here is ever
 * auto-converted (D-017, D-077).
 */
export const common: Widen<EnCommon> = {
  actions: {
    save: "Sačuvaj",
    cancel: "Odustani",
    back: "Nazad",
    retry: "Pokušaj ponovo",
    close: "Zatvori",
    edit: "Izmeni",
    delete: "Obriši",
    confirm: "Potvrdi",
  },
  state: {
    loading: "Učitavanje…",
    empty: "Ovde još nema ničega",
    saving: "Čuvanje…",
    saved: "Sačuvano",
  },
  language: {
    settingsTitle: "Jezik i regionalna podešavanja",
    systemLanguage: "Sistemski jezik",
    contentLanguage: "Podrazumevani jezik za nov sadržaj",
    useSystemLanguageForContent: "Koristi sistemski jezik za nov sadržaj",
    changeNotice:
      "Ovo menja navigaciju platforme, sistemske poruke i buduće sistemske emailove. Postojeći sadržaj neće biti preveden niti izmenjen.",
  },
};
