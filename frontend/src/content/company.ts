/**
 * B2B configurator — „Kako možemo pomoći vašoj organizaciji?" (demo).
 *
 * Questions and result mapping per Anja's answers
 * (documentations/odgovor-za-matching-anketa.pdf, 2026-07-18). Anja did NOT
 * provide B2B prices, so every model is „Cena po ponudi" — no guaranteed
 * capacities, no annual lease promises until the business model is confirmed.
 *
 * Still a frontend demo: no backend, no persistence, no employee health data.
 */

export const COMPANY_INTRO = {
  title: "Kako možemo pomoći vašoj organizaciji?",
  description:
    "Kroz nekoliko kratkih pitanja predložićemo model saradnje koji odgovara veličini vašeg tima i temama koje su vam važne.",
  offer: [
    "radionice",
    "predavanja i vebinari",
    "individualno savetovanje zaposlenih",
    "podrška menadžerima",
    "burnout programi",
    "team building radionice",
  ],
  cta: "Konfigurišite program",
} as const;

// --- Question option constants -------------------------------------------

export const COMPANY_SIZES = {
  upTo20: "Do 20",
  s20_50: "20–50",
  s50_200: "50–200",
  over200: "Više od 200",
} as const;

export const COMPANY_GOALS = {
  lecture: "Predavanje ili vebinar",
  workshop: "Radionicu",
  longTerm: "Dugoročnu saradnju",
  individualSupport: "Individualnu podršku zaposlenima",
  needsAssessment: "Procenu potreba",
} as const;

export const COMPANY_TOPICS = {
  burnout: "Burnout",
  stress: "Stres",
  communication: "Komunikacija",
  leadership: "Liderstvo",
  mentalHealth: "Mentalno zdravlje",
  psychSafety: "Psihološka sigurnost",
} as const;

export const COMPANY_FORMATS = {
  online: "Online",
  inPerson: "Uživo",
  combined: "Kombinovano",
  unsure: "Nismo sigurni",
} as const;

export type CompanyStepKey = "employees" | "goals" | "topics" | "format";

export interface CompanyStep {
  key: CompanyStepKey;
  question: string;
  options: readonly string[];
  multi?: boolean;
}

export const companySteps: CompanyStep[] = [
  {
    key: "employees",
    question: "Koliko zaposlenih imate?",
    options: Object.values(COMPANY_SIZES),
  },
  {
    key: "goals",
    question: "Šta želite da organizujete?",
    options: Object.values(COMPANY_GOALS),
    multi: true,
  },
  {
    key: "topics",
    question: "Koje teme vas najviše zanimaju?",
    options: Object.values(COMPANY_TOPICS),
    multi: true,
  },
  {
    key: "format",
    question: "Koji format vam odgovara?",
    options: Object.values(COMPANY_FORMATS),
  },
];

export interface CompanyAnswers {
  employees: string | null;
  goals: string[];
  topics: string[];
  format: string | null;
}

export const emptyCompanyAnswers: CompanyAnswers = {
  employees: null,
  goals: [],
  topics: [],
  format: null,
};

// --- Models (all „Cena po ponudi" — no confirmed B2B prices) --------------

export const COMPANY_PRICE_ON_REQUEST = "Cena po ponudi";

/**
 * Presentation-only plan cards for the public page. They are not a public
 * price list or a contractual offer. The existing configurator still decides
 * its own recommendation from answers.
 */
export interface CompanyPlanCard {
  slug: string;
  title: string;
  description: string;
  status: "draft" | "pending-confirmation";
}

export const companyPlanCards: CompanyPlanCard[] = [
  {
    slug: "pojedinacni-pristup",
    title: "Pojedinačni pristup",
    description:
      "Za organizacije koje žele fleksibilan početak podrške zaposlenima.",
    status: "pending-confirmation",
  },
  {
    slug: "team-flex",
    title: "Team Flex",
    description:
      "Za timove kojima je potreban prilagodljiv spoj radionica i podrške.",
    status: "draft",
  },
  {
    slug: "rezervisani-kapacitet",
    title: "Rezervisani kapacitet",
    description:
      "Za organizacije koje žele da unapred razgovaraju o kontinuitetu podrške.",
    status: "pending-confirmation",
  },
  {
    slug: "program-po-meri",
    title: "Program po meri",
    description:
      "Za kombinovane potrebe koje se definišu kroz konsultativni razgovor.",
    status: "draft",
  },
];

export interface CompanyDeliveryFact {
  title: string;
  description: string;
}

/** Public facts that do not imply a fixed B2B price or capacity commitment. */
export const companyDeliveryFacts: CompanyDeliveryFact[] = [
  {
    title: "Fleksibilni termini",
    description: "Format i termini se dogovaraju prema potrebama organizacije.",
  },
  {
    title: "Rezervisani kapacitet",
    description:
      "Mogućnost rezervisanog kapaciteta razmatra se kroz ponudu; broj termina i trajanje nisu javno potvrđeni.",
  },
  {
    title: "Način plaćanja",
    description:
      "Način plaćanja definiše se u ponudi, nakon dogovora o obimu programa.",
  },
  {
    title: "Privatnost zaposlenih",
    description: "Konfigurator ne prikuplja zdravstvene podatke zaposlenih.",
  },
];

export interface CompanyFaqItem {
  question: string;
  answer: string;
}

export const companyFaqItems: CompanyFaqItem[] = [
  {
    question: "Da li su cene javno objavljene?",
    answer:
      "Ne. Cena, obim, kapacitet i način plaćanja potvrđuju se nakon razgovora i kroz ponudu.",
  },
  {
    question: "Da li rezervisani kapacitet važi odmah?",
    answer:
      "Ne. Rezervisani kapacitet može biti deo dogovora, ali se potvrđuje tek kroz konkretnu ponudu.",
  },
  {
    question: "Šta se dešava nakon konfiguratora?",
    answer:
      "Nakon kratkog upitnika tim predlaže sledeći razgovor kako bi precizirao teme, format i okvir saradnje.",
  },
];

export function findCompanyPlan(slug: string | null | undefined) {
  return companyPlanCards.find((plan) => plan.slug === slug);
}

export interface CompanyModel {
  slug: string;
  name: string;
  description: string;
  /** Requires a consultative call before any concrete offer. */
  contactRequired: boolean;
}

export const companyModels: Record<string, CompanyModel> = {
  "lecture-custom": {
    slug: "lecture-custom",
    name: "Predavanje ili vebinar po meri",
    description:
      "Stručno predavanje ili vebinar prilagođen vašem timu — tema, trajanje i termin po dogovoru.",
    contactRequired: false,
  },
  "team-workshop": {
    slug: "team-workshop",
    name: "Interaktivna radionica za tim",
    description:
      "Iskustvena radionica prilagođena vašem timu, sa praktičnim vežbama i prostorom za razgovor.",
    contactRequired: false,
  },
  "employee-support-program": {
    slug: "employee-support-program",
    name: "Program podrške zaposlenima",
    description:
      "Dugoročna saradnja koja kombinuje poverljivo individualno savetovanje zaposlenih sa edukativnim aktivnostima za tim.",
    contactRequired: false,
  },
  "flexible-fund": {
    slug: "flexible-fund",
    name: "Fleksibilni fond individualnih termina",
    description:
      "Zaposleni poverljivo koriste individualne razgovore kada im podrška zatreba — bez uvida kompanije u sadržaj.",
    contactRequired: false,
  },
  "needs-assessment": {
    slug: "needs-assessment",
    name: "Uvodna procena potreba organizacije",
    description:
      "Kratka procena potreba tima kao osnova za predlog daljih koraka i odgovarajućeg oblika podrške.",
    contactRequired: false,
  },
  "custom-program": {
    slug: "custom-program",
    name: "Program po meri",
    description:
      "Za veće organizacije i kombinovane potrebe program definišemo zajedno, nakon kratkog konsultativnog razgovora.",
    contactRequired: true,
  },
};

/**
 * Deterministic model recommendation per Anja's mapping:
 * - >200 zaposlenih ili više različitih zahteva → Program po meri (obavezan
 *   kontakt);
 * - dugoročna saradnja + individualna podrška → Program podrške zaposlenima;
 * - procena potreba → Uvodna procena potreba organizacije;
 * - individualna podrška → Fleksibilni fond individualnih termina;
 * - radionica → Interaktivna radionica za tim;
 * - predavanje/vebinar → Predavanje ili vebinar po meri.
 * Topics personalise the description; they never change the model or price.
 */
export function recommendCompanyModel(answers: CompanyAnswers): CompanyModel {
  const { employees, goals } = answers;

  if (employees === COMPANY_SIZES.over200 || goals.length >= 3) {
    return companyModels["custom-program"]!;
  }
  if (
    goals.includes(COMPANY_GOALS.longTerm) &&
    goals.includes(COMPANY_GOALS.individualSupport)
  ) {
    return companyModels["employee-support-program"]!;
  }
  if (goals.includes(COMPANY_GOALS.needsAssessment)) {
    return companyModels["needs-assessment"]!;
  }
  if (goals.includes(COMPANY_GOALS.individualSupport)) {
    return companyModels["flexible-fund"]!;
  }
  if (goals.includes(COMPANY_GOALS.workshop)) {
    return companyModels["team-workshop"]!;
  }
  if (goals.includes(COMPANY_GOALS.lecture)) {
    return companyModels["lecture-custom"]!;
  }
  return companyModels["custom-program"]!;
}
