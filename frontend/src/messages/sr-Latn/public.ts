import type { EnPublicUi } from "@/messages/en/public";
import type { Widen } from "@/messages/types";

export const publicUi: Widen<EnPublicUi> = {
  brand: { tagline: "Digitalni centar za mentalno zdravlje" },
  navigation: {
    mainLabel: "Glavna navigacija",
    quickLabel: "Brza navigacija",
    mobileLabel: "Mobilna navigacija",
    menuLabel: "Meni",
    openMenu: "Otvori meni",
    closeMenu: "Zatvori meni",
    book: "Zakaži termin",
    links: {
      support: "Pronađi podršku",
      therapists: "Terapeuti",
      services: "Usluge",
      workshops: "Radionice",
      knowledge: "Znanje i resursi",
      compass: "Kompas",
      about: "O nama",
      parents: "Roditeljska podrška",
      prices: "Cene",
      team: "Tim",
      companies: "Rad sa kompanijama",
      contact: "Kontakt",
    },
  },
  footer: {
    description:
      "Digitalni centar za mentalno zdravlje. Psihoterapija, savetovanje, radionice i edukativni sadržaji — na jednom mestu.",
    formats: "{locations} · online i uživo",
    supportGroup: "Podrška",
    organizationGroup: "Psihointegritet",
    rights: "© 2026 Psihointegritet. Sva prava zadržana.",
    disclaimer:
      "Sadržaji na ovoj stranici imaju edukativnu svrhu i ne predstavljaju zamenu za individualni razgovor sa stručnom osobom.",
  },
};
