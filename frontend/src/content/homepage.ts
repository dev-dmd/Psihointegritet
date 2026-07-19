/**
 * Typed staging content for the public homepage, extracted from the Claude
 * Design handoff. Ekavica is the site-wide default (T9) — the only exception
 * is Anja Stamenković's personal voice (quotes/bio), which lives separately in
 * `content/therapists.ts`, not here. Replaced by CMS/backend data in later
 * milestones.
 */

export interface NavLink {
  label: string;
  href: string;
}

export type TrustIcon = "screen" | "pin" | "people" | "shield";

export interface TrustItem {
  icon: TrustIcon;
  label: string;
}

export interface CompaniesContent {
  eyebrow: string;
  title: string;
  description: string;
  action: { label: string; href: string };
}

export interface ClientLink {
  prefix: string;
  label: string;
  href: string;
}

export interface ReasonCard {
  number: string;
  title: string;
  description: string;
  href: string;
}

export interface ServiceStat {
  label: string;
  value: string;
}

export interface FeaturedService {
  badge: string;
  title: string;
  description: string;
  stats: ServiceStat[];
  ctaLabel: string;
  ctaHref: string;
}

export interface MidService {
  title: string;
  description: string;
  duration: string;
  price: string;
  format: string;
}

export interface SmallService {
  title: string;
  description: string;
  href: string;
}

export interface FirstSessionStep {
  number: string;
  title: string;
  description: string;
}

export interface WorkshopFact {
  label: string;
  value: string;
}

export interface ResourceArticle {
  category: string;
  title: string;
  description: string;
}

export interface FaqItem {
  id: string;
  question: string;
  answer: string;
}

/**
 * Absolute hrefs, not bare anchors: the header and footer now render on every
 * public page (see app/(public)/layout.tsx), so „#usluge" alone would be dead
 * everywhere except the homepage.
 */
export const navLinks: NavLink[] = [
  { label: "Pronađi podršku", href: "/#podrska" },
  { label: "Terapeuti", href: "/tim" },
  { label: "Usluge", href: "/usluge" },
  { label: "Radionice", href: "/#radionice" },
  { label: "Znanje i resursi", href: "/znanje" },
  { label: "O nama", href: "/#onama" },
];

export const companies: CompaniesContent = {
  eyebrow: "Za organizacije",
  title: "Rad sa kompanijama",
  description:
    "Radionice, edukacije i psihološka podrška za timove i zaposlene.",
  action: { label: "Saznajte više", href: "/rad-sa-kompanijama" },
};

export const clientLink: ClientLink = {
  prefix: "Već ste klijent?",
  label: "Zakažite naredni termin",
  href: "/zakazivanje",
};

/** Catalog per Anja's answers (2026-07-18); couples name fixed by T1 („Bračno savetovanje"). */
export const footerServiceLinks: NavLink[] = [
  { label: "Individualna psihoterapija", href: "/usluge" },
  { label: "Bračno savetovanje", href: "/usluge" },
  { label: "Roditeljsko savetovanje", href: "/usluge" },
  { label: "Radionice", href: "/#radionice" },
];

export const trustItems: TrustItem[] = [
  { icon: "screen", label: "Online i uživo" },
  { icon: "pin", label: "Niš i rad sa dijasporom" },
  { icon: "people", label: "Individualni i partnerski rad" },
  { icon: "shield", label: "Poverljivost i stručnost" },
];

export const reasons: ReasonCard[] = [
  {
    number: "01",
    title: "Stres i burnout",
    description:
      "Kada iscrpljenost postane svakodnevica, a odmor više ne pomaže.",
    href: "#terapeuti",
  },
  {
    number: "02",
    title: "Partnerski odnosi",
    description:
      "Komunikacija, bliskost, konflikti i faze kroz koje odnos prolazi.",
    href: "#terapeuti",
  },
  {
    number: "03",
    title: "Anksioznost i emocionalne teškoće",
    description: "Briga, napetost i osećanja koja je teško imenovati.",
    href: "#terapeuti",
  },
  {
    number: "04",
    title: "Roditeljstvo",
    description: "Podrška u izazovima roditeljske uloge i odnosu sa decom.",
    href: "#terapeuti",
  },
  {
    number: "05",
    title: "Samopouzdanje i granice",
    description: "Jasnije zauzimanje za sebe, bez osećaja krivice.",
    href: "#terapeuti",
  },
  {
    number: "06",
    title: "Podrška adolescentima",
    description: "Siguran prostor za mlade u periodu odrastanja i promena.",
    href: "#terapeuti",
  },
];

export const featuredService: FeaturedService = {
  badge: "Najčešći izbor",
  title: "Individualna psihoterapija",
  description:
    "Prostor u kojem u svom tempu istražujete ono što vas opterećuje — uz podršku terapeuta i geštalt pristup koji podstiče svesnost, autentičnost i odgovornost za vlastiti život.",
  stats: [
    { label: "Trajanje", value: "60 minuta" },
    { label: "Cena", value: "4.000 RSD" },
    { label: "Format", value: "online ili uživo" },
  ],
  ctaLabel: "Zakaži prvi razgovor",
  ctaHref: "#prvi-razgovor",
};

export const midServices: MidService[] = [
  {
    title: "Bračno savetovanje",
    description:
      "Zajednički rad na komunikaciji, bliskosti i obrascima koji se ponavljaju u odnosu.",
    duration: "90 minuta",
    price: "5.500 RSD",
    format: "online ili uživo",
  },
  {
    title: "Roditeljsko savetovanje",
    description:
      "Savetodavna podrška roditeljima u razumevanju deteta i jačanju odnosa.",
    duration: "60 minuta",
    price: "5.000 RSD",
    format: "online ili uživo",
  },
];

export const smallServices: SmallService[] = [
  {
    title: "Adolescenti",
    description: "Individualni rad prilagođen mladima i njihovom tempu.",
    href: "#terapeuti",
  },
  {
    title: "Roditeljstvo",
    description: "Savetodavna podrška roditeljima u svim fazama.",
    href: "#terapeuti",
  },
  {
    title: "Radionice",
    description: "Grupna iskustvena učenja kroz geštalt pristup.",
    href: "#radionice",
  },
];

export const firstSessionSteps: FirstSessionStep[] = [
  {
    number: "01",
    title: "Upoznavanje",
    description:
      "Razgovaramo o razlogu zbog kojeg dolazite i o tome šta vas trenutno opterećuje.",
  },
  {
    number: "02",
    title: "Očekivanja i pitanja",
    description:
      "Istražujemo vaša očekivanja od terapije. Imate priliku postaviti sva pitanja koja vas zanimaju.",
  },
  {
    number: "03",
    title: "Naredni koraci",
    description:
      "Terapeut objašnjava način rada i pravila poverljivosti, pa zajedno dogovarate kako dalje.",
  },
];

export const workshopFacts: WorkshopFact[] = [
  { label: "Trajanje", value: "3 sata" },
  { label: "Format", value: "Grupni rad uživo" },
  { label: "Namenjeno", value: "Svima, bez iskustva" },
];

export const resources: ResourceArticle[] = [
  {
    category: "Stres i burnout",
    title: "Kako prepoznati burnout pre nego što postane ozbiljan problem?",
    description:
      "Burnout se ne pojavljuje odjednom. Često mu prethode dugotrajan umor, gubitak motivacije, razdražljivost i osećaj da se ni nakon odmora ne oporavljamo. Saznajte koje rane signale ne treba zanemariti.",
  },
  {
    category: "Psihoterapija",
    title:
      "Zašto nije potrebno da dođemo do „pucanja“ da bismo potražili podršku?",
    description:
      "Psihoterapija nije rezervisana samo za krizne trenutke. Razgovor sa terapeutom može biti prostor za bolje razumevanje sebe, odnosa i obrazaca koje želimo da promenimo.",
  },
  {
    category: "Granice i odnosi",
    title: "Postavljanje granica bez osećaja krivice",
    description:
      "Granice nisu odbacivanje drugih, već način da zaštitimo svoje potrebe, vreme i emocionalni prostor. Istražite zašto se krivica javlja i kako možemo jasnije komunicirati ono što nam je važno.",
  },
];

export const faqItems: FaqItem[] = [
  {
    id: "poverljivost",
    question: "Da li je sve što kažem poverljivo?",
    answer:
      "Da. Sve informacije ostaju između klijenta i terapeuta, osim u situacijama propisanim zakonom i etičkim kodeksom.",
  },
  {
    id: "trajanje",
    question: "Koliko traje terapija?",
    answer:
      "Trajanje zavisi od vaših ciljeva i potreba. Neki ljudi dolaze nekoliko meseci, dok drugi biraju dugoročniji proces.",
  },
  {
    id: "online",
    question: "Da li mogu raditi online?",
    answer: "Da. Sve usluge dostupne su i online.",
  },
  {
    id: "izbor-terapeuta",
    question: "Kako da znam koji terapeut mi odgovara?",
    answer:
      "Na profilima terapeuta možete pronaći informacije o njihovom pristupu, iskustvu i oblastima rada, a uvek nas možete kontaktirati za preporuku.",
  },
  {
    id: "dijagnoza",
    question: "Da li mi treba dijagnoza da bih došao na terapiju?",
    answer:
      "Ne. Psihoterapija je namenjena svima koji žele bolje razumeti sebe ili prolaze kroz izazovan životni period.",
  },
];
