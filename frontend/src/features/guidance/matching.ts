import { therapists } from "@/content/therapists";
import type { Therapist } from "@/types/therapist";

/**
 * Intake & Matching Engine v2 — deterministic, explainable, non-diagnostic.
 * Questions, weights and assignment rules come from Anja's answers
 * (documentations/odgovor-za-matching-anketa.pdf, 2026-07-18).
 *
 * Principles (unchanged from v1):
 * - before submission, answers live only in client memory; a production
 *   submission is persisted only through the approved backend contract;
 * - no numeric scores shown to users — plain-language reasons only;
 * - never "no therapist found" — always at least one recommendation or the
 *   team-review path;
 * - the questionnaire is NOT a diagnostic tool and must never suggest one.
 *
 * All scoring lives here (matchingWeights) — never in React components.
 */

// --- Question option constants -------------------------------------------

export const REASONS = {
  anxiety: "Anksioznost",
  depression: "Depresivno raspoloženje",
  partnerRelationship: "Partnerski odnos",
  maritalProblems: "Bračni problemi",
  parenting: "Roditeljstvo",
  adolescent: "Odnos sa adolescentom",
  burnout: "Burnout",
  grief: "Gubitak ili žalovanje",
  selfEsteem: "Samopouzdanje",
  personalGrowth: "Lični razvoj",
  trauma: "Trauma",
  unsure: "Ne znam tačno, želim razgovor",
  other: "Drugo",
} as const;

export const PARTICIPANTS = {
  alone: "Sam/a",
  partner: "Partner i ja",
  parentChild: "Roditelj i dete",
  unsure: "Nisam siguran/na",
} as const;

export const REQUESTER_ROLES = {
  selfAdult: "Za sebe kao punoletna osoba",
  guardian: "Roditelj ili zakonski staratelj",
  adolescent: "Adolescent od 16 ili 17 godina",
  informationOnly: "Tražim samo informacije",
} as const;

/** Age bands preserve minimization: no date of birth is collected in Intake. */
export const SUBJECT_AGE_BANDS = [
  "Mlađe od 12 godina",
  "12–15 godina",
  "16–17 godina",
  "18 i više",
] as const;

export const ADULT_SUBJECT_AGE_BAND = SUBJECT_AGE_BANDS[3];

export const PRIOR_THERAPY = {
  yes: "Da",
  no: "Ne",
} as const;

export const GOALS = {
  understandSelf: "Razumeti sebe",
  emotions: "Naučiti kako da se nosim sa emocijama",
  improvePartner: "Poboljšati partnerski odnos",
  improveChild: "Poboljšati odnos sa detetom",
  stress: "Prevazići stres",
  concreteSituation: "Razrešiti konkretnu životnu situaciju",
  unsure: "Nisam siguran/na",
} as const;

export const WORK_FORMATS = {
  online: "Online",
  inPerson: "Uživo",
  any: "Svejedno",
} as const;

export const LOCATIONS = {
  nis: "Niš",
  leskovac: "Leskovac",
  other: "Druga lokacija",
} as const;

// --- Intake copy ----------------------------------------------------------

export const INTAKE_INTRO = {
  title: "Pronađite podršku koja vam odgovara",
  description:
    "Odgovorite na nekoliko kratkih pitanja kako bismo vam predložili terapeuta i oblik rada koji prema oblastima rada i iskustvu može odgovarati vašim potrebama.",
  note: "Upitnik nije dijagnostički alat i ne postavlja dijagnozu. Preporuka služi kao pomoć pri izboru i ne predstavlja stručnu procenu.",
  cta: "Započni upitnik",
} as const;

/** Draft safety copy — final wording is blocked on legal review (STOP S5). */
export const SAFETY_NOTICE =
  "Platforma nije hitna služba. Ako ste u neposrednoj opasnosti ili imate misli da povredite sebe ili drugog, potražite neposrednu pomoć preko lokalne hitne službe ili osobe od poverenja. Slanje zahteva preko sajta ne znači da tim prati situaciju u realnom vremenu.";

/** Controlled until Legal + Clinical approve the final minor-service rules. */
export const MINOR_NOTE =
  "Za maloletne korisnike tim najpre proverava odgovarajući sledeći korak. Slanje zahteva nije potvrda termina niti rezervacija.";

// --- Answers & steps ------------------------------------------------------

export interface IntakeAnswers {
  requesterRole: string | null;
  reason: string | null;
  participants: string | null;
  /** Conditional — only for guardian or adolescent paths. */
  subjectAgeBand: string | null;
  priorTherapy: string | null;
  goal: string | null;
  format: string | null;
  /** Conditional — only when format = „Uživo". */
  location: string | null;
}

export const emptyIntakeAnswers: IntakeAnswers = {
  requesterRole: null,
  reason: null,
  participants: null,
  subjectAgeBand: null,
  priorTherapy: null,
  goal: null,
  format: null,
  location: null,
};

export type IntakeStepKey =
  | "requesterRole"
  | "reason"
  | "participants"
  | "subjectAgeBand"
  | "priorTherapy"
  | "goal"
  | "format"
  | "location";

export interface IntakeStep {
  key: IntakeStepKey;
  question: string;
  options: readonly string[];
}

const baseSteps: Record<IntakeStepKey, IntakeStep> = {
  requesterRole: {
    key: "requesterRole",
    question: "Ko podnosi zahtev?",
    options: Object.values(REQUESTER_ROLES),
  },
  reason: {
    key: "reason",
    question: "Šta je glavni razlog zbog kojeg nam se javljate?",
    options: Object.values(REASONS),
  },
  participants: {
    key: "participants",
    question: "Ko bi učestvovao u radu?",
    options: [PARTICIPANTS.alone, PARTICIPANTS.partner, PARTICIPANTS.unsure],
  },
  subjectAgeBand: {
    key: "subjectAgeBand",
    question: "Kojoj uzrasnoj grupi pripada osoba za koju se javljate?",
    options: SUBJECT_AGE_BANDS,
  },
  priorTherapy: {
    key: "priorTherapy",
    question: "Da li ste ranije bili na psihoterapiji?",
    options: Object.values(PRIOR_THERAPY),
  },
  goal: {
    key: "goal",
    question: "Šta vam je trenutno najvažnije?",
    options: Object.values(GOALS),
  },
  format: {
    key: "format",
    question: "Kako želite da radite?",
    options: Object.values(WORK_FORMATS),
  },
  location: {
    key: "location",
    question: "Koja lokacija vam odgovara?",
    options: Object.values(LOCATIONS),
  },
};

/**
 * Ordered active steps. Guardian and adolescent paths set participation
 * deterministically, which keeps the public questionnaire short.
 */
export function activeIntakeSteps(answers: IntakeAnswers): IntakeStep[] {
  const steps: IntakeStep[] = [baseSteps.requesterRole];
  if (answers.requesterRole === REQUESTER_ROLES.informationOnly) {
    return steps;
  }
  steps.push(baseSteps.reason);
  if (answers.requesterRole === REQUESTER_ROLES.guardian) {
    steps.push(baseSteps.subjectAgeBand);
  } else if (answers.requesterRole === REQUESTER_ROLES.selfAdult) {
    steps.push(baseSteps.participants);
  }
  steps.push(baseSteps.goal, baseSteps.format);
  if (answers.format === WORK_FORMATS.inPerson) {
    steps.push(baseSteps.location);
  }
  return steps;
}

// --- Therapist matching configuration ------------------------------------

const ANJA = "anja-stamenkovic";
const MARIJA = "marija-stamenkovic";
const MARJAN = "marjan-jankovic";

type Slug = typeof ANJA | typeof MARIJA | typeof MARJAN;

const ALL_SLUGS: readonly Slug[] = [ANJA, MARIJA, MARJAN];

export interface TherapistMatchingProfile {
  slug: Slug;
  /** Areas of work per Anja's document — matching config, not public copy. */
  areas: readonly string[];
  serviceCapabilities: readonly string[];
  acceptedAgeBands: readonly string[];
  supportedFormats: readonly string[];
  locations: readonly ("Niš" | "Leskovac")[];
  acceptanceStatus: "accepting" | "limited" | "paused";
  presenceStatus: "active" | "temporarily_absent";
  /** Grammatically correct reason sentences (gender-aware). */
  onlineReason: string;
  inPersonReason: string;
}

/**
 * Areas of work exactly as confirmed in Anja's answers — do not add areas that
 * are not listed here. Canonical public name and slug stay Marjan Janković.
 */
export const therapistMatchingConfig: Record<Slug, TherapistMatchingProfile> = {
  [ANJA]: {
    slug: ANJA,
    areas: [
      "individualna psihoterapija",
      "bračno savetovanje",
      "burnout",
      "emocionalni razvoj",
      "lični razvoj",
      "trauma",
      "gubitak i žalovanje",
      "anksioznost",
      "roditeljsko savetovanje",
      "samopouzdanje",
    ],
    serviceCapabilities: [
      "individual_therapy",
      "marital_counseling",
      "parenting_support",
      "adolescent_support_16_plus",
      "addiction_related_support",
    ],
    acceptedAgeBands: ["16–17 godina", "18 i više"],
    supportedFormats: ["online", "in_person"],
    locations: ["Niš"],
    acceptanceStatus: "accepting",
    presenceStatus: "active",
    onlineReason: "Dostupna je za online rad.",
    inPersonReason: "Radi uživo u Nišu.",
  },
  [MARIJA]: {
    slug: MARIJA,
    areas: [
      "individualna psihoterapija",
      "razvoj dece",
      "vaspitni izazovi",
      "adolescenti",
      "porodični odnosi",
      "lični razvoj",
      "emocionalni razvoj",
      "anksioznost",
      "depresivno raspoloženje",
      "roditeljstvo",
    ],
    serviceCapabilities: [
      "individual_therapy",
      "parenting_support",
      "children_and_adolescents_pending",
    ],
    acceptedAgeBands: SUBJECT_AGE_BANDS,
    supportedFormats: ["online", "in_person"],
    locations: ["Leskovac"],
    acceptanceStatus: "accepting",
    presenceStatus: "active",
    onlineReason: "Dostupna je za online rad.",
    inPersonReason: "Radi uživo u Leskovcu.",
  },
  [MARJAN]: {
    slug: MARJAN,
    areas: [
      "individualna psihoterapija",
      "bračno savetovanje",
      "podrška zaposlenima",
      "trauma",
      "anksioznost",
      "depresivno raspoloženje",
      "lični razvoj",
      "gubitak i žalovanje",
      "konkretne životne situacije",
    ],
    serviceCapabilities: [
      "individual_therapy",
      "marital_counseling",
      "parenting_support",
      "adolescent_support_16_plus",
    ],
    acceptedAgeBands: ["16–17 godina", "18 i više"],
    supportedFormats: ["online", "in_person"],
    locations: ["Leskovac"],
    acceptanceStatus: "accepting",
    presenceStatus: "active",
    onlineReason: "Dostupan je za online rad.",
    inPersonReason: "Radi uživo u Leskovcu.",
  },
};

// --- Weights (Anja's demo starting weights) -------------------------------

type WeightMap = Partial<Record<Slug, number>>;

/**
 * Question 1 — main reason.
 *
 * TODO(team): „Burnout: Marijan +2 ako je povezano sa zaposlenjem ili
 * kompanijskim programom" — upitnik trenutno nema pitanje/signal o zaposlenju,
 * pa se taj uslovni bonus ne primenjuje dok tim ne potvrdi kako se prepoznaje.
 */
const reasonWeights: Record<string, WeightMap> = {
  [REASONS.anxiety]: { [ANJA]: 3, [MARIJA]: 3, [MARJAN]: 3 },
  [REASONS.depression]: { [MARIJA]: 4, [MARJAN]: 4 },
  [REASONS.partnerRelationship]: { [ANJA]: 5, [MARJAN]: 5 },
  [REASONS.maritalProblems]: { [ANJA]: 5, [MARJAN]: 5 },
  [REASONS.parenting]: { [ANJA]: 4, [MARIJA]: 4 },
  [REASONS.adolescent]: { [MARIJA]: 6 },
  [REASONS.burnout]: { [ANJA]: 6 },
  [REASONS.grief]: { [ANJA]: 5, [MARJAN]: 5 },
  [REASONS.selfEsteem]: { [ANJA]: 5, [MARIJA]: 2, [MARJAN]: 2 },
  [REASONS.personalGrowth]: { [ANJA]: 3, [MARIJA]: 3, [MARJAN]: 3 },
  [REASONS.trauma]: { [ANJA]: 5, [MARJAN]: 5 },
  [REASONS.unsure]: { [ANJA]: 1, [MARIJA]: 1, [MARJAN]: 1 },
  [REASONS.other]: { [ANJA]: 1, [MARIJA]: 1, [MARJAN]: 1 },
};

/** Question 2 — participants. (Prior-therapy question never affects scores.) */
const participantWeights: Record<string, WeightMap> = {
  [PARTICIPANTS.alone]: { [ANJA]: 1, [MARIJA]: 1, [MARJAN]: 1 },
  [PARTICIPANTS.partner]: { [ANJA]: 6, [MARJAN]: 6 },
  // Anja +2 is for roditeljsko savetovanje only — never automatic direct work
  // with the child.
  [PARTICIPANTS.parentChild]: { [MARIJA]: 6, [ANJA]: 2 },
  [PARTICIPANTS.unsure]: { [ANJA]: 1, [MARIJA]: 1, [MARJAN]: 1 },
};

/** Question 4 — what matters most right now. */
const goalWeights: Record<string, WeightMap> = {
  [GOALS.understandSelf]: { [ANJA]: 3, [MARIJA]: 2, [MARJAN]: 2 },
  [GOALS.emotions]: { [ANJA]: 4, [MARIJA]: 4, [MARJAN]: 2 },
  [GOALS.improvePartner]: { [ANJA]: 6, [MARJAN]: 6 },
  [GOALS.improveChild]: { [MARIJA]: 6, [ANJA]: 3 },
  [GOALS.stress]: { [ANJA]: 4, [MARJAN]: 4, [MARIJA]: 2 },
  [GOALS.concreteSituation]: { [MARJAN]: 5, [ANJA]: 2, [MARIJA]: 2 },
  [GOALS.unsure]: { [ANJA]: 1, [MARIJA]: 1, [MARJAN]: 1 },
};

export const matchingWeights = {
  reason: reasonWeights,
  participants: participantWeights,
  goal: goalWeights,
} as const;

// --- Services -------------------------------------------------------------

export const RECOMMENDED_SERVICES = {
  individual: "Individualna psihoterapija",
  couples: "Bračno savetovanje",
  parenting: "Roditeljsko savetovanje",
} as const;

/** Which therapists provide which recommended service (per Anja's lists). */
const serviceProviders: Record<string, readonly Slug[]> = {
  [RECOMMENDED_SERVICES.individual]: ALL_SLUGS,
  [RECOMMENDED_SERVICES.couples]: [ANJA, MARJAN],
  [RECOMMENDED_SERVICES.parenting]: [ANJA, MARIJA, MARJAN],
};

const serviceCapabilityByRecommendation: Record<string, string> = {
  [RECOMMENDED_SERVICES.individual]: "individual_therapy",
  [RECOMMENDED_SERVICES.couples]: "marital_counseling",
  [RECOMMENDED_SERVICES.parenting]: "parenting_support",
};

/**
 * Service is decided separately from the therapist:
 * 1. „Partner i ja" → Bračno savetovanje;
 * 2. „Roditelj i dete" / „Roditeljstvo" / „Odnos sa adolescentom" →
 *    Roditeljsko savetovanje (adolescent support goes through the parent);
 * 3. otherwise → Individualna psihoterapija.
 */
export function recommendService(answers: IntakeAnswers): string {
  if (answers.participants === PARTICIPANTS.partner) {
    return RECOMMENDED_SERVICES.couples;
  }
  if (
    answers.participants === PARTICIPANTS.parentChild ||
    answers.reason === REASONS.parenting ||
    (answers.reason === REASONS.adolescent &&
      answers.requesterRole === REQUESTER_ROLES.guardian)
  ) {
    return RECOMMENDED_SERVICES.parenting;
  }
  return RECOMMENDED_SERVICES.individual;
}

// --- Reason sentences (max 3 per recommendation, no scores) ---------------

const reasonAreaSentence: Record<string, string> = {
  [REASONS.anxiety]: "Radi sa temom anksioznosti.",
  [REASONS.depression]: "Radi sa temom depresivnog raspoloženja.",
  [REASONS.partnerRelationship]: "Radi sa parovima i partnerskim temama.",
  [REASONS.maritalProblems]: "Radi sa parovima i partnerskim temama.",
  [REASONS.parenting]: "Radi sa temama roditeljstva.",
  [REASONS.adolescent]: "Radi sa adolescentima i porodičnim odnosima.",
  [REASONS.burnout]: "Radi sa temama burnouta i stresa.",
  [REASONS.grief]: "Radi sa temama gubitka i žalovanja.",
  [REASONS.selfEsteem]: "Radi sa temama samopouzdanja.",
  [REASONS.personalGrowth]: "Radi sa temama ličnog razvoja.",
  [REASONS.trauma]: "Radi sa temom traume.",
};

/** Maps a reason answer to the config area it corresponds to, per therapist. */
const reasonToArea: Record<string, string[]> = {
  [REASONS.anxiety]: ["anksioznost"],
  [REASONS.depression]: ["depresivno raspoloženje"],
  [REASONS.partnerRelationship]: ["bračno savetovanje"],
  [REASONS.maritalProblems]: ["bračno savetovanje"],
  [REASONS.parenting]: ["roditeljsko savetovanje", "roditeljstvo"],
  [REASONS.adolescent]: ["adolescenti"],
  [REASONS.burnout]: ["burnout"],
  [REASONS.grief]: ["gubitak i žalovanje"],
  [REASONS.selfEsteem]: ["samopouzdanje"],
  [REASONS.personalGrowth]: ["lični razvoj"],
  [REASONS.trauma]: ["trauma"],
};

const serviceSentence: Record<string, string> = {
  [RECOMMENDED_SERVICES.individual]: "Pruža individualnu psihoterapiju.",
  [RECOMMENDED_SERVICES.couples]: "Pruža bračno savetovanje.",
  [RECOMMENDED_SERVICES.parenting]: "Pruža roditeljsko savetovanje.",
};

function buildReasons(
  slug: Slug,
  answers: IntakeAnswers,
  service: string,
): string[] {
  const profile = therapistMatchingConfig[slug];
  const sentences: string[] = [];

  const reason = answers.reason;
  if (reason && reasonAreaSentence[reason]) {
    const areas = reasonToArea[reason] ?? [];
    if (areas.some((area) => profile.areas.includes(area))) {
      sentences.push(reasonAreaSentence[reason]);
    }
  }

  if (serviceProviders[service]?.includes(slug)) {
    sentences.push(serviceSentence[service] ?? "");
  }

  const selectedLocation =
    answers.location === LOCATIONS.nis
      ? "Niš"
      : answers.location === LOCATIONS.leskovac
        ? "Leskovac"
        : null;
  if (
    answers.format === WORK_FORMATS.inPerson &&
    (selectedLocation !== null || answers.location === LOCATIONS.other)
  ) {
    sentences.push(
      selectedLocation !== null && profile.locations.includes(selectedLocation)
        ? profile.inPersonReason
        : profile.onlineReason,
    );
  } else {
    sentences.push(profile.onlineReason);
  }

  return sentences.filter(Boolean).slice(0, 3);
}

// --- Evaluation -----------------------------------------------------------

export interface TherapistMatch {
  therapist: Therapist;
  reasons: string[];
}

export interface IntakeMatchResult {
  /** All eligible therapists, best first. */
  recommendedTherapists: TherapistMatch[];
  primaryRecommendation: TherapistMatch | null;
  alternativeRecommendation: TherapistMatch | null;
  /** True → show two therapists side by side (difference < 3 or a tie). */
  showBoth: boolean;
  recommendedService: string;
  /** True when the chosen location has no in-person availability → offer online. */
  onlineFallback: boolean;
  needsManualReview: boolean;
  controlledMinorFlow: boolean;
  /** Development/debug only — never rendered to users, never emailed. */
  scoreBreakdown: Record<string, number>;
}

function therapistBySlug(slug: Slug): Therapist {
  const found = therapists.find((item) => item.slug === slug);
  if (!found) {
    throw new Error(`Matching config references unknown therapist: ${slug}`);
  }
  return found;
}

/**
 * Pure, deterministic evaluation:
 * 1. score all therapists from the weight tables (prior-therapy never scores);
 * 2. apply format/location constraints (in-person filters by city; a location
 *    without coverage falls back to online — never "no therapist");
 * 3. top result ≥3 points ahead → one primary + optional alternative;
 *    otherwise show the top two together.
 */
export function evaluateIntake(answers: IntakeAnswers): IntakeMatchResult {
  const scores: Record<Slug, number> = { [ANJA]: 0, [MARIJA]: 0, [MARJAN]: 0 };

  const apply = (weights: WeightMap | undefined) => {
    if (!weights) return;
    for (const slug of ALL_SLUGS) {
      scores[slug] += weights[slug] ?? 0;
    }
  };

  apply(answers.reason ? reasonWeights[answers.reason] : undefined);
  apply(
    answers.participants ? participantWeights[answers.participants] : undefined,
  );
  apply(answers.goal ? goalWeights[answers.goal] : undefined);

  // „Odnos sa adolescentom" + „Roditelj i dete" → Marija dobija dodatnih +3.
  if (
    answers.reason === REASONS.adolescent &&
    answers.participants === PARTICIPANTS.parentChild
  ) {
    scores[MARIJA] += 3;
  }

  const service = recommendService(answers);
  const serviceEligible = serviceProviders[service] ?? [];
  const requiredCapability = serviceCapabilityByRecommendation[service];
  if (!requiredCapability) {
    throw new Error(`Missing capability mapping for ${service}`);
  }
  let eligible: Slug[] = ALL_SLUGS.filter(
    (slug) =>
      serviceEligible.includes(slug) &&
      therapistMatchingConfig[slug].serviceCapabilities.includes(
        requiredCapability,
      ) &&
      therapistMatchingConfig[slug].acceptanceStatus !== "paused" &&
      therapistMatchingConfig[slug].presenceStatus === "active",
  );
  let onlineFallback = false;
  if (answers.format === WORK_FORMATS.online) {
    eligible = eligible.filter((slug) =>
      therapistMatchingConfig[slug].supportedFormats.includes("online"),
    );
  } else if (answers.format === WORK_FORMATS.inPerson) {
    if (answers.location === LOCATIONS.nis) {
      const inCity = eligible.filter(
        (slug) =>
          therapistMatchingConfig[slug].supportedFormats.includes(
            "in_person",
          ) && therapistMatchingConfig[slug].locations.includes("Niš"),
      );
      eligible =
        inCity.length > 0
          ? inCity
          : eligible.filter((slug) =>
              therapistMatchingConfig[slug].supportedFormats.includes("online"),
            );
      onlineFallback = inCity.length === 0;
    } else if (answers.location === LOCATIONS.leskovac) {
      const inCity = eligible.filter(
        (slug) =>
          therapistMatchingConfig[slug].supportedFormats.includes(
            "in_person",
          ) && therapistMatchingConfig[slug].locations.includes("Leskovac"),
      );
      eligible =
        inCity.length > 0
          ? inCity
          : eligible.filter((slug) =>
              therapistMatchingConfig[slug].supportedFormats.includes("online"),
            );
      onlineFallback = inCity.length === 0;
    } else if (answers.location === LOCATIONS.other) {
      eligible = eligible.filter((slug) =>
        therapistMatchingConfig[slug].supportedFormats.includes("online"),
      );
      onlineFallback = true;
    }
  }

  if (
    answers.subjectAgeBand !== null &&
    answers.subjectAgeBand !== ADULT_SUBJECT_AGE_BAND
  ) {
    const worksWithAge = (slug: Slug) =>
      therapistMatchingConfig[slug].acceptedAgeBands.includes(
        answers.subjectAgeBand ?? "",
      );
    const ageEligible = eligible.filter(worksWithAge);
    if (ageEligible.length > 0) {
      eligible = ageEligible;
    } else {
      eligible = ALL_SLUGS.filter(
        (slug) =>
          serviceEligible.includes(slug) &&
          therapistMatchingConfig[slug].serviceCapabilities.includes(
            requiredCapability,
          ) &&
          therapistMatchingConfig[slug].acceptanceStatus !== "paused" &&
          therapistMatchingConfig[slug].presenceStatus === "active" &&
          worksWithAge(slug) &&
          therapistMatchingConfig[slug].supportedFormats.includes("online"),
      );
      onlineFallback = true;
    }
  }

  const requiredFieldsPresent = Boolean(
    answers.requesterRole &&
    answers.reason &&
    answers.participants &&
    answers.goal &&
    answers.format,
  );
  const controlledMinorFlow =
    answers.requesterRole === REQUESTER_ROLES.guardian ||
    answers.requesterRole === REQUESTER_ROLES.adolescent;
  const unpublishedChildScope =
    answers.subjectAgeBand === SUBJECT_AGE_BANDS[0] ||
    answers.subjectAgeBand === SUBJECT_AGE_BANDS[1];
  const needsManualReview =
    !requiredFieldsPresent ||
    answers.reason === REASONS.other ||
    controlledMinorFlow ||
    eligible.length === 0;

  const ranked = eligible
    .map((slug) => ({
      slug,
      score:
        scores[slug] -
        (therapistMatchingConfig[slug].acceptanceStatus === "limited" ? 1 : 0),
    }))
    .sort(
      (a, b) =>
        b.score - a.score ||
        ALL_SLUGS.indexOf(a.slug) - ALL_SLUGS.indexOf(b.slug),
    );

  const toMatch = (slug: Slug): TherapistMatch => ({
    therapist: therapistBySlug(slug),
    reasons: buildReasons(slug, answers, service),
  });

  const recommendedTherapists = unpublishedChildScope
    ? []
    : ranked.map((entry) => toMatch(entry.slug));
  const primary = recommendedTherapists[0] ?? null;
  const alternative = recommendedTherapists[1] ?? null;
  const showBoth =
    !unpublishedChildScope &&
    ranked.length > 1 &&
    (ranked[0]?.score ?? 0) - (ranked[1]?.score ?? 0) < 3;

  return {
    recommendedTherapists,
    primaryRecommendation: primary,
    alternativeRecommendation: alternative,
    showBoth,
    recommendedService: service,
    onlineFallback,
    needsManualReview,
    controlledMinorFlow,
    scoreBreakdown: scores,
  };
}
