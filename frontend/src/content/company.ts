/**
 * B2B configurator — „Program podrške zaposlenima" (demo).
 *
 * Hardcoded, throwaway demo (spec §5A / decisions D-021, D-023). Shows a
 * company a recommended package + indicative price, then collects a structured
 * inquiry that is emailed to the team. No backend, no company codes, no
 * credits, no Booking Engine — those are the real R4 module.
 *
 * Prices are WORKING demo figures (base 5.000 RSD/session). Anja confirms the
 * base price, tax treatment, cancellation rules and workshop pricing before any
 * of this goes live (S-list). Employee health data is never collected.
 */

/** Keys into CompanyAnswers, so the drawer knows where each step's answer goes. */
export type CompanyStepKey =
  | "needs"
  | "teamSize"
  | "scheduleModel"
  | "funding"
  | "period"
  | "monthlySessions"
  | "delivery";

export interface CompanyStep {
  key: CompanyStepKey;
  question: string;
  options: string[];
  /** Multi-select steps let the user pick several answers. */
  multi?: boolean;
}

// --- Option constants (shared by questions, recommendation and email) ---

export const NEEDS = {
  confidential: "Poverljive individualne razgovore",
  stress: "Podršku u upravljanju stresom",
  burnout: "Prevenciju iscrpljenosti i sagorevanja",
  parents: "Podršku roditeljima",
  managers: "Podršku menadžerima i rukovodiocima",
  teamComms: "Bolju komunikaciju i odnose u timu",
  workshops: "Radionice i edukativne programe",
  orgChange: "Podršku tokom organizacionih promena",
  recommend: "Potrebna nam je preporuka",
  other: "Nešto drugo",
} as const;

export const TEAM_SIZES = {
  s1_2: "1–2 osobe",
  s3_9: "3–9 osoba",
  s10_30: "10–30 osoba",
  s31_100: "31–100 osoba",
  s100plus: "Više od 100 osoba",
  unknown: "Još ne znamo",
} as const;

export const SCHEDULE_MODELS = {
  flexible: "Fleksibilni termini",
  reserved: "Rezervisani kapacitet",
  hybrid: "Hibridni model",
  workshops: "Radionice i edukacije",
  unsure: "Nismo sigurni",
} as const;

export const FUNDING = {
  all: "Kompanija plaća sve termine",
  perEmployee: "Kompanija obezbeđuje ograničen broj termina po zaposlenom",
  initial: "Kompanija finansira početne termine, a zaposleni može da nastavi",
  sharedPool: "Kompanija kupuje zajednički fond termina",
  recommend: "Potrebna nam je preporuka",
} as const;

export const PERIODS = {
  oneOff: "Jednokratna podrška",
  pilot: "Tromesečni pilot",
  sixMonths: "Šest meseci",
  twelveMonths: "Dvanaest meseci",
  ongoing: "Kontinuirana saradnja",
  undecided: "Još nismo odlučili",
} as const;

export const MONTHLY_SESSIONS = {
  s4: "4 termina",
  s8: "8 termina",
  s12: "12 termina",
  s20: "20 termina",
  estimate: "Potrebna nam je procena",
} as const;

export const DELIVERY = {
  online: "Online",
  nis: "Uživo u Nišu",
  leskovac: "Uživo u Leskovcu",
  combined: "Kombinovano",
  onSite: "U prostorijama kompanije",
  recommend: "Potrebna nam je preporuka",
} as const;

// --- Step definitions ---

export const companySteps: CompanyStep[] = [
  {
    key: "needs",
    question: "Šta želite da omogućite zaposlenima?",
    options: Object.values(NEEDS),
    multi: true,
  },
  {
    key: "teamSize",
    question: "Koliko ljudi treba da ima pristup?",
    options: Object.values(TEAM_SIZES),
  },
  {
    key: "scheduleModel",
    question: "Kako želite da se program koristi?",
    options: Object.values(SCHEDULE_MODELS),
  },
  {
    key: "funding",
    question: "Kako se finansira podrška?",
    options: Object.values(FUNDING),
  },
  {
    key: "period",
    question: "Period saradnje",
    options: Object.values(PERIODS),
  },
  {
    key: "delivery",
    question: "Način realizacije",
    options: Object.values(DELIVERY),
  },
];

/** Extra question shown only when the period is „Dvanaest meseci". */
export const monthlySessionsStep: CompanyStep = {
  key: "monthlySessions",
  question: "Koliko termina želite da rezervišete svakog meseca?",
  options: Object.values(MONTHLY_SESSIONS),
};

/** Ordered active steps, inserting the monthly-sessions step only for 12 months. */
export function activeCompanySteps(period: string | null): CompanyStep[] {
  const base = companySteps.slice(0, 5); // needs … period
  const tail = companySteps.slice(5); // delivery
  return period === PERIODS.twelveMonths
    ? [...base, monthlySessionsStep, ...tail]
    : [...base, ...tail];
}

// --- Packages ---

export interface CompanyPlan {
  slug: string;
  name: string;
  audience: string;
  model: string;
  price: string;
  /** What the company gets — shown on the recommendation screen. */
  includes: string[];
  /** True when no fixed price is computed (large team / custom). */
  quoteOnly: boolean;
}

export const companyPlans: Record<string, CompanyPlan> = {
  "individual-voucher": {
    slug: "individual-voucher",
    name: "Individualni voucher",
    audience: "1–2 osobe",
    model: "Plaćanje pojedinačnih termina",
    price: "5.000 RSD po terminu",
    includes: [
      "Poverljivi individualni termini",
      "Zaposleni bira termin kada mu podrška zatreba",
      "Kompanija ne vidi sadržaj razgovora",
    ],
    quoteOnly: false,
  },
  "team-flex-4": {
    slug: "team-flex-4",
    name: "Team Flex 4",
    audience: "3–9 zaposlenih",
    model: "4 fleksibilna termina mesečno",
    price: "20.000 RSD mesečno",
    includes: [
      "Zajednički fond od 4 termina mesečno",
      "Zaposleni koriste termine po potrebi",
      "Zbirni pregled iskorišćenosti bez ličnih podataka",
    ],
    quoteOnly: false,
  },
  "team-flex-8": {
    slug: "team-flex-8",
    name: "Team Flex 8",
    audience: "3–9 zaposlenih",
    model: "8 fleksibilnih termina mesečno",
    price: "38.000 RSD mesečno",
    includes: [
      "Zajednički fond od 8 termina mesečno",
      "Veći kapacitet za timove sa više potreba",
      "Zbirni pregled iskorišćenosti bez ličnih podataka",
    ],
    quoteOnly: false,
  },
  "company-flex-10": {
    slug: "company-flex-10",
    name: "Company Flex 10",
    audience: "10+ zaposlenih",
    model: "10 fleksibilnih termina mesečno",
    price: "47.500 RSD mesečno",
    includes: [
      "Zajednički fond od 10 termina mesečno",
      "Podrška za veće timove",
      "Zbirni pregled iskorišćenosti bez ličnih podataka",
    ],
    quoteOnly: false,
  },
  "company-partner": {
    slug: "company-partner",
    name: "Company Partner",
    audience: "10+ zaposlenih",
    model: "Veći fond termina, radionice i podrška menadžmentu",
    price: "Cena po ponudi",
    includes: [
      "Kombinacija individualnih termina i radionica",
      "Konsultacije za rukovodioce",
      "Prilagođen obim prema potrebama tima",
    ],
    quoteOnly: true,
  },
  "reserved-capacity": {
    slug: "reserved-capacity",
    name: "Reserved Capacity",
    audience: "Sve veličine tima",
    model: "Godišnje rezervisani termini",
    price: "Prema izabranom kapacitetu",
    includes: [
      "Ugovoreni broj termina rezervisan samo za vašu kompaniju",
      "Neiskorišćen termin prenosi se najduže u naredni mesec",
      "Predvidiv mesečni kapacitet",
    ],
    quoteOnly: true,
  },
  "company-custom": {
    slug: "company-custom",
    name: "Prilagođen program",
    audience: "Veći timovi i posebne potrebe",
    model: "Program se definiše prema vašim ciljevima",
    price: "Cena po ponudi",
    includes: [
      "Okvirni program je pripremljen",
      "Konačan kapacitet i cenu definišemo nakon kratkog konsultativnog razgovora",
    ],
    quoteOnly: true,
  },
};

// --- Recommendation ---

export interface CompanyAnswers {
  needs: string[];
  teamSize: string | null;
  scheduleModel: string | null;
  funding: string | null;
  period: string | null;
  monthlySessions: string | null;
  delivery: string | null;
}

/**
 * Deterministic, explainable package recommendation (spec §6). Faithful to the
 * spec's `recommendCompanyPlan`: workshops-first, then team size and schedule
 * model. Teams over 30 are never auto-priced — they get the custom program.
 */
export function recommendCompanyPlan(answers: CompanyAnswers): CompanyPlan {
  const { needs, teamSize, scheduleModel } = answers;

  if (
    scheduleModel === SCHEDULE_MODELS.workshops ||
    needs.includes(NEEDS.workshops)
  ) {
    return companyPlans["company-custom"]!;
  }
  if (teamSize === TEAM_SIZES.s1_2) {
    return companyPlans["individual-voucher"]!;
  }
  if (scheduleModel === SCHEDULE_MODELS.reserved) {
    return companyPlans["reserved-capacity"]!;
  }
  if (scheduleModel === SCHEDULE_MODELS.hybrid) {
    return companyPlans["company-partner"]!;
  }
  if (teamSize === TEAM_SIZES.s3_9) {
    // Higher expected usage → the larger flexible pool.
    const higher =
      answers.monthlySessions === MONTHLY_SESSIONS.s8 ||
      answers.monthlySessions === MONTHLY_SESSIONS.s12 ||
      answers.monthlySessions === MONTHLY_SESSIONS.s20;
    return companyPlans[higher ? "team-flex-8" : "team-flex-4"]!;
  }
  if (teamSize === TEAM_SIZES.s10_30) {
    return companyPlans["company-flex-10"]!;
  }
  // 31–100, 100+, unknown → custom (no auto price for large teams).
  return companyPlans["company-custom"]!;
}
