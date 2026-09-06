import type { EnErrors } from "@/messages/en/errors";
import type { Widen } from "@/messages/types";

export const errors: Widen<EnErrors> = {
  surfaces: {
    generic: {
      request: "Zahtev nije završen.",
    },
    content: {
      load: "Sadržaj nije učitan.",
      change: "Izmena sadržaja nije završena.",
      import: "Dokument nije uvezen u editor sadržaja.",
      publish: "Sadržaj nije objavljen.",
    },
    legal: {
      load: "Dokumenti nisu učitani.",
      change: "Izmena dokumenta nije završena.",
      import: "Word dokument nije uvezen.",
      publish: "Dokument nije objavljen.",
    },
    taxonomy: {
      load: "Kompas registar nije učitan.",
      change: "Izmena Kompas registra nije završena.",
      publish: "Stavka registra nije objavljena.",
    },
    research: {
      load: "Rezultati istraživanja nisu učitani.",
    },
    compass: {
      load: "Kompas nije učitan.",
      change: "Izmena Kompasa nije završena.",
      publish: "Kompas tok nije objavljen.",
    },
    diagnostics: {
      load: "Dijagnostika nije učitana.",
      run: "Dijagnostička provera nije završena.",
    },
    organization: {
      load: "Podešavanja organizacije nisu učitana.",
      change: "Podešavanja jezika nisu sačuvana.",
    },
    booking: {
      submit: "Zahtev za termin nije poslat.",
    },
  },
  actions: {
    network: "Proverite vezu i pokušajte ponovo.",
    unauthorized: "Osvežite stranicu, prijavite se ponovo i ponovite radnju.",
    forbidden: "Zatražite pristup od administratora organizacije.",
    notFound: "Vratite se na listu i osvežite je.",
    conflict:
      "Osvežite stavku, pregledajte poslednje izmene i pokušajte ponovo.",
    validation: "Proverite označena polja i ispravite podatke.",
    tooLarge: "Izaberite manji fajl i pokušajte ponovo.",
    rateLimited: "Sačekajte trenutak i pokušajte ponovo.",
    unavailable: "Sačekajte nekoliko minuta i pokušajte ponovo.",
    server: "Pokušajte ponovo za nekoliko minuta.",
    generic: "Pokušajte ponovo.",
  },
  fieldErrors: {
    missing: "Ovo polje je obavezno.",
    intParsing: "Unesite ceo broj.",
    floatParsing: "Unesite broj.",
    boolParsing: "Izaberite da ili ne.",
    uuidParsing: "Izaberite postojeću stavku iz liste.",
    stringTooShort: "Unesite dužu vrednost.",
    stringTooLong: "Skratite ovu vrednost.",
    valueError: "Proverite ovu vrednost.",
    fallback: "Proverite ovo polje.",
  },
  codeOverrides: {
    fileTypeInvalid: {
      message: "Izabrani fajl nije Word .docx dokument.",
      nextAction: "Sačuvajte ga kao .docx i pokušajte ponovo.",
    },
    taxonomyStableIdConflict: {
      message:
        "Stavka sa ovim nazivom ili identifikatorom već postoji u registru.",
      nextAction: "Otvorite postojeću stavku ili unesite drugačiji naziv.",
    },
    taxonomyInvalidId: {
      message: "Ovaj identifikator registra nije dozvoljen.",
      nextAction: "Koristite mala slova, brojeve i crtice.",
    },
    taxonomySystemLocked: {
      message: "Ova sistemska vrednost ne može da se menja.",
      nextAction: "Napravite zasebnu tenant stavku.",
    },
    taxonomyOptimisticLock: {
      message: "Druga osoba je u međuvremenu izmenila ovu stavku registra.",
      nextAction:
        "Osvežite stavku, pregledajte novu verziju i pokušajte ponovo.",
    },
    compassOptimisticLock: {
      message: "Druga osoba je u međuvremenu izmenila ovaj Kompas tok.",
      nextAction: "Osvežite tok, pregledajte novu verziju i pokušajte ponovo.",
    },
    organizationOperatorReasonRequired: {
      message: "Podešavanja jezika nisu sačuvana.",
      nextAction: "Dodajte razlog za operatorsku izmenu i pokušajte ponovo.",
    },
    bookingConflict: {
      message: "Zahtev za termin je u sukobu sa novijom izmenom.",
      nextAction: "Osvežite dostupne opcije i izaberite ponovo.",
    },
    bookingSlotConflict: {
      message: "Taj termin više nije dostupan.",
      nextAction: "Izaberite drugi dostupan termin.",
    },
    diagnosticNotFound: {
      message: "Ova dijagnostička provera više nije dostupna.",
      nextAction: "Vratite se na listu dijagnostike i osvežite je.",
    },
  },
};
