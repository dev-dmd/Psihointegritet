/**
 * B2B configurator — „Kako možemo pomoći vašoj organizaciji?" (demo).
 *
 * Questions and result mapping per Anja's answers
 * (documentations/odgovor-za-matching-anketa.pdf, 2026-07-18). Anja did NOT
 * provide B2B prices, so every model is „Cena po ponudi" — no guaranteed
 * capacities, no annual lease promises until the business model is confirmed.
 * The earlier demo packages (Team Flex etc.) are retired.
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
