import type { FallbackContent } from "@/content/pack-types";

import { emptyWorkspaceDemo } from "../empty-workspace";

export const mentalHealthStarterSrLatn: FallbackContent = {
  metadata: {
    packId: "mental-health-starter",
    locale: "sr-Latn",
    demoDataMode: "empty",
    sourceStatus: {
      publicSite: "draft",
      therapists: "missing",
      services: "missing",
      companies: "missing",
      research: "missing",
      compass: "missing",
      legal: "missing",
    },
    editorGuidance: {
      homepage:
        "Objasnite kome centar pruža podršku, kako radi i koji je jedan jasan sledeći korak. Zamenite starter pre slanja na pregled za objavu.",
      services:
        "Dodajte samo potvrđene usluge. Trajanje, format, cenu i pravila zakazivanja preuzmite iz odobrenog poslovnog izvora.",
      therapists:
        "Profil pravite samo iz biografije i zvanja koje je dostavio ili odobrio taj stručnjak.",
    },
  },
  homepage: {
    companies: {
      eyebrow: "Za organizacije",
      title: "Podrška prilagođena vašem timu",
      description:
        "Pogledajte jasan put za razgovor sa centrom o potrebama vaše organizacije.",
      action: { label: "Započnite razgovor", href: "/rad-sa-kompanijama" },
    },
    clientLink: {
      prefix: "Već sarađujete sa centrom?",
      label: "Otvorite klijentski panel",
      href: "/zakazi?source=homepage",
    },
    footerServiceLinks: [],
    trustItems: [
      { icon: "screen", label: "Jasne informacije pre sledećeg koraka" },
      { icon: "people", label: "Izbor podrške prema objavljenim profilima" },
      {
        icon: "shield",
        label: "Kontakt podaci služe za odgovor na vaš zahtev",
      },
    ],
    reasons: [
      {
        number: "01",
        title: "Upoznajte dostupnu podršku",
        description:
          "Na jednom mestu pregledajte objavljene usluge, pristup i praktične informacije centra.",
        href: "/usluge",
      },
      {
        number: "02",
        title: "Upoznajte stručnjake",
        description:
          "Pročitajte odobrene profile i odlučite kome želite da se javite.",
        href: "/tim",
      },
      {
        number: "03",
        title: "Izaberite sledeći korak",
        description:
          "Pošaljite zahtev kada budete spremni. Zahtev nije potvrda termina.",
        href: "/zakazi",
      },
    ],
    firstSessionSteps: [
      {
        number: "01",
        title: "Pregledajte objavljene informacije",
        description:
          "Proverite uslugu, stručnjaka i praktične detalje koje je centar objavio.",
      },
      {
        number: "02",
        title: "Pošaljite zahtev",
        description:
          "Ostavite kontakt podatke koji su centru potrebni da vam odgovori.",
      },
      {
        number: "03",
        title: "Dogovorite sledeći korak",
        description:
          "Centar direktno potvrđuje dostupnost i objašnjava šta sledi.",
      },
    ],
    workshopFacts: [],
    resources: [
      {
        category: "Prvi koraci",
        title: "Kako da koristite informacije na ovom sajtu",
        description:
          "Uporedite objavljene usluge i profile stručnjaka, pa izaberite način kontakta koji odgovara vašim potrebama.",
      },
    ],
    faqItems: [
      {
        id: "choose-next-step",
        question: "Kako da izaberem sledeći korak?",
        answer:
          "Počnite od objavljenih usluga i profila stručnjaka. Ako nešto nije jasno, javite se centru pre slanja zahteva za termin.",
      },
      {
        id: "request-confirmation",
        question: "Da li je poslati zahtev potvrđen termin?",
        answer:
          "Nije. Centar pregleda zahtev i javlja vam se da potvrdi dostupnost i sledeći korak.",
      },
    ],
  },
  services: {
    serviceCatalog: [],
    PRICE_NOTE:
      "Podaci o uslugama i cenama biće prikazani kada ih centar objavi.",
    sessionPackages: [],
    supportAreas: [],
  },
  therapists: [],
  workspaceDemo: emptyWorkspaceDemo(),
};
