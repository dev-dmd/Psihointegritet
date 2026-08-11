import type { EnWorkspace } from "@/messages/en/workspace";
import type { Widen } from "@/messages/types";

/**
 * Every value here is **byte-identical to what the shell rendered before
 * I18N-4**. That is the acceptance criterion for this slice and it is asserted,
 * not asserted-to: `workspace-shell.test.tsx` renders the sidebar and bottom nav
 * and compares the visible text against the strings that were hardcoded.
 *
 * "Control Center" and "Psihointegritet" are proper nouns and stay untranslated
 * in both catalogues — the parity check's untranslated-value rule would
 * otherwise flag them, which is why they live under `brand` and are the one
 * documented exception.
 */
export const workspace: Widen<EnWorkspace> = {
  brand: {
    name: "Psihointegritet",
    panel: "Control Center",
  },
  nav: {
    sections: {
      business: "Poslovanje",
      team: "Tim",
      settings: "Podešavanja",
    },
    home: "Pregled",
    appointments: "Termini",
    clients: "Klijenti",
    companies: "Kompanije",
    services: "Usluge i cene",
    research: "Istraživanja",
    documents: "Dokumenti i saglasnosti",
    content: "Sadržaj",
    compass: "Kompas",
    therapists: "Terapeuti",
    profile: "Moj profil",
    locations: "Lokacije i način rada",
    notifications: "Obaveštenja",
    centreSettings: "Podešavanja centra",
    more: "Više",
    soon: "Uskoro",
    hasError: "(ima grešku)",
  },
  shell: {
    // Placeholder identity until the backend hands over a display name; the
    // role line beneath it already comes from `roles`.
    memberName: "Član tima",
    quickActionSoon: "Brza akcija stiže sa Booking engine-om.",
    moreSoon: "Još opcija stiže uskoro.",
  },
  settings: {
    page: {
      title: "Podešavanja",
      description:
        "Postavke centra postoje kao rute i navigacija — konfiguracija stiže u kasnijim fazama.",
      locations: {
        title: "Lokacije i način rada",
        body: "Adrese, prostorije i pravila za online/uživo rad centra.",
      },
      notifications: {
        title: "Obaveštenja",
        body: "Email podsetnici i pravila slanja — stižu sa notifikacijama.",
      },
      centre: {
        title: "Podešavanja centra",
        body: "Radno vreme centra, pravila otkazivanja i opšte postavke.",
      },
    },
    title: "Jezik i regionalna podešavanja",
    intro:
      "Jezik pripada organizaciji, ne osobi — izmena ovde važi za svakoga ko u njoj radi.",
    systemLanguage: "Sistemski jezik",
    systemLanguageHelp:
      "Navigacija, sistemske poruke, statusi i sistemski email. Primenjuje se na sledećem ekranu koji otvorite.",
    contentLanguage: "Jezik javnog sajta i novog sadržaja",
    contentLanguageHelp:
      "Pomera javni sajt, njegove adrese i sitemap. Postojeći tekstovi se ne prevode.",
    useSystemLanguage: "Koristi sistemski jezik i za nov sadržaj",
    notice:
      "Ovo menja navigaciju platforme, sistemske poruke i buduće sistemske emailove. Postojeći sadržaj neće biti preveden niti izmenjen.",
    contentWarning:
      "Promena jezika sadržaja ne prevodi ono što je već objavljeno. Dok neko ne napiše tekst na novom jeziku, javni sajt prikazuje placeholder tekstove.",
    save: "Sačuvaj jezike",
    saved: "Jezici su sačuvani.",
    onlyAdmin: "Samo administrator organizacije može da menja ova podešavanja.",
    loadFailed: "Podešavanja nisu učitana.",
  },
  topbar: {
    allTherapists: "Svi terapeuti",
    notifications: "Obaveštenja",
    quickAction: "Brza akcija",
    userMenu: "Korisnički meni",
    noNotifications: "Nema novih obaveštenja.",
  },
  roles: {
    adminAndTherapist: "Administrator i terapeut",
    admin: "Administrator centra",
    therapist: "Terapeut",
    member: "Član tima",
  },
  superadmin: {
    panel: "Superadmin",
    nav: {
      home: "Pregled",
      tenants: "Tenanti",
      features: "Feature Gates",
      featuresShort: "Gates",
      diagnostics: "Dijagnostika",
      billing: "Pretplate",
      auditLog: "Audit Log",
      settings: "Podešavanja",
    },
  },
};
