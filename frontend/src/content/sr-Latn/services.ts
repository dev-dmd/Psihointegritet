import type {
  ServiceCatalogItem,
  SessionPackage,
  SupportArea,
} from "@/content/services";

/** The tenant's own catalogue text. Overridden field by field by the CMS (D-038). */
export const serviceCatalog: ServiceCatalogItem[] = [
  {
    slug: "individualna-psihoterapija",
    name: "Individualna psihoterapija",
    description:
      "Prostor u kojem u svom tempu istražujete ono što vas opterećuje — uz podršku terapeuta i geštalt pristup koji podstiče svesnost, autentičnost i odgovornost za vlastiti život.",
    duration: "60 minuta",
    priceAmount: 4000,
    format: "online ili uživo",
    audience:
      "Za osobe koje žele da uz podršku terapeuta istraže ono što ih opterećuje.",
    firstStep:
      "Pošaljite zahtev za termin, a zatim sa terapeutom dogovorite prvi razgovor.",
  },
  {
    slug: "bracno-savetovanje",
    name: "Bračno savetovanje",
    description:
      "Zajednički rad na komunikaciji, bliskosti i obrascima koji se ponavljaju u odnosu.",
    duration: "90 minuta",
    priceAmount: 5500,
    format: "online ili uživo",
    audience:
      "Za parove koji žele da rade na komunikaciji, bliskosti i obrascima u odnosu.",
    firstStep:
      "Pošaljite zajednički zahtev za termin, pa sa terapeutom dogovorite prvi razgovor.",
  },
  {
    slug: "roditeljsko-savetovanje",
    name: "Roditeljsko savetovanje",
    description:
      "Savetodavna podrška roditeljima u razumevanju deteta i jačanju odnosa, u svim uzrastima.",
    duration: "60 minuta",
    priceAmount: 5000,
    format: "online ili uživo",
    audience:
      "Za roditelje koji žele podršku u razumevanju deteta i jačanju odnosa.",
    firstStep:
      "Pošaljite zahtev za termin, a zatim sa terapeutom dogovorite prvi razgovor.",
  },
];

/** Mandatory price disclaimer (T7). */
export const PRICE_NOTE: string =
  "Cene su okvirne i služe kao orijentacija. Tačan dogovor o terminu i uslovima pravite direktno sa terapeutom.";

export const sessionPackages: SessionPackage[] = [
  {
    sessions: 5,
    deadline: "rok realizacije 3 meseca",
    priceAmount: 15000,
    fullPriceAmount: 20000,
  },
  { sessions: 10, deadline: "rok realizacije 5 meseci", priceAmount: 38000 },
];

export const supportAreas: SupportArea[] = [
  {
    title: "Podrška adolescentima",
    description:
      "Individualni rad prilagođen mladima i njihovom tempu, uz dogovor sa roditeljem ili starateljem.",
    href: "/tim",
  },
  {
    title: "Podrška roditeljima",
    description:
      "Savetodavna podrška roditeljima u izazovima roditeljske uloge, u svim fazama.",
    href: "/podrska-roditeljima",
  },
  {
    title: "Radionice",
    description:
      "Grupna iskustvena učenja kroz geštalt pristup — najave i prijava interesovanja.",
    href: "/radionice",
  },
];
