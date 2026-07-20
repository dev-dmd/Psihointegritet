import { therapists } from "@/content/therapists";
import type { Therapist } from "@/types/therapist";

/**
 * Intake & Matching Engine v2 — deterministic, explainable, non-diagnostic.
 * Questions, weights and assignment rules come from Anja's answers
 * (documentations/odgovor-za-matching-anketa.pdf, 2026-07-18).
 *
 * Principles (unchanged from v1):
 * - answers live only in client memory; never persisted or logged (T13/§11);
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
  addiction: "Zavisnost",
  unsure: "Ne znam tačno, želim razgovor",
  other: "Drugo",
} as const;

export const PARTICIPANTS = {
  alone: "Sam/a",
  partner: "Partner i ja",
  parentChild: "Roditelj i dete",
  unsure: "Nisam siguran/na",
} as const;

/**
 * Child age groups — shown only when „Roditelj i dete" is chosen.
 *
 * Age rule confirmed by Anja (2026-07-20): Marija works with all child ages
 * (0–18 and 18+); Anja and Marjan work only with children 16+. The „13–17"
 * bracket from the earlier draft was split into „13–15" / „16–17" so the 16+
 * boundary can be applied precisely (each bracket maps to a minimum age in
 * `CHILD_AGE_MIN_AGE`).
 */
export const CHILD_AGE_GROUPS = [
  "Do 7 godina",
  "7–12 godina",
  "13–15 godina",
  "16–17 godina",
  "18 i više",
] as const;

export const ADULT_CHILD_AGE_GROUP = CHILD_AGE_GROUPS[4];

/** Minimum age represented by each bracket — used for the per-therapist gate. */
const CHILD_AGE_MIN_AGE: Record<string, number> = {
  "Do 7 godina": 0,
  "7–12 godina": 7,
  "13–15 godina": 13,
  "16–17 godina": 16,
  "18 i više": 18,
};

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
  "Vođeni izbor ne postavlja dijagnozu i nije hitna služba. Ako vam je potrebna pomoć koja ne može da čeka redovan termin, pogledajte dostupne opcije za neposrednu podršku.";

/** T10: minors never get self-service booking — appointments go through a parent/guardian. */
export const MINOR_NOTE =
  "Termini za maloletnike dogovaraju se isključivo uz roditelja ili staratelja.";

export const OTHER_TEXT_PROMPT =
  "Ako želite, ukratko opišite šta vam je trenutno važno.";

// --- Answers & steps ------------------------------------------------------

export interface IntakeAnswers {
  reason: string | null;
  /** Optional free text shown for „Drugo" — appended to the summary only. */
  reasonOtherText: string;
  participants: string | null;
  /** Conditional — only when participants = „Roditelj i dete". */
  childAgeGroup: string | null;
  priorTherapy: string | null;
  goal: string | null;
  format: string | null;
  /** Conditional — only when format = „Uživo". */
  location: string | null;
}

export const emptyIntakeAnswers: IntakeAnswers = {
  reason: null,
  reasonOtherText: "",
  participants: null,
  childAgeGroup: null,
  priorTherapy: null,
  goal: null,
  format: null,
  location: null,
};

export type IntakeStepKey =
  | "reason"
  | "participants"
  | "childAgeGroup"
  | "priorTherapy"
  | "goal"
  | "format"
  | "location";

export interface IntakeStep {
  key: IntakeStepKey;
  question: string;
  options: readonly string[];
  /** Shows the optional free-text field under the options ("Drugo"). */
  hasOtherText?: boolean;
}

const baseSteps: Record<IntakeStepKey, IntakeStep> = {
  reason: {
    key: "reason",
    question: "Šta je glavni razlog zbog kojeg nam se javljate?",
    options: Object.values(REASONS),
    hasOtherText: true,
  },
  participants: {
    key: "participants",
    question: "Ko bi učestvovao u radu?",
    options: Object.values(PARTICIPANTS),
  },
  childAgeGroup: {
    key: "childAgeGroup",
    question: "Kojoj uzrasnoj grupi pripada dete?",
    options: CHILD_AGE_GROUPS,
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
 * Ordered active steps for the current answers. The child-age step appears
 * only for „Roditelj i dete"; the location step only for „Uživo".
 */
export function activeIntakeSteps(answers: IntakeAnswers): IntakeStep[] {
  const steps: IntakeStep[] = [baseSteps.reason, baseSteps.participants];
  if (answers.participants === PARTICIPANTS.parentChild) {
    steps.push(baseSteps.childAgeGroup);
  }
  steps.push(baseSteps.priorTherapy, baseSteps.goal, baseSteps.format);
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
  /** City where in-person work is currently available. */
  inPersonCity: "Niš" | "Leskovac";
  /** All three therapists work online. */
  online: true;
  /**
   * Youngest child age (in years) the therapist works with directly (Anja's
   * answers, 2026-07-20): Marija 0, Anja/Marjan 16. A therapist is eligible
   * for a „Roditelj i dete" case only when the child's age bracket meets this.
   */
  minChildAge: number;
  /** Grammatically correct reason sentences (gender-aware). */
  onlineReason: string;
  inPersonReason: string;
}

/**
 * Areas of work exactly as confirmed in Anja's answers — do not add areas that
 * are not listed here. (Canonical name/slug for Marjan stays per D-006, even
 * though the source document sometimes writes „Marijan".)
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
      "zavisnost",
      "trauma",
      "gubitak i žalovanje",
      "anksioznost",
      "roditeljsko savetovanje",
      "samopouzdanje",
    ],
    inPersonCity: "Niš",
    online: true,
    minChildAge: 16,
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
    inPersonCity: "Leskovac",
    online: true,
    minChildAge: 0,
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
    inPersonCity: "Leskovac",
    online: true,
    minChildAge: 16,
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
  [REASONS.addiction]: { [ANJA]: 6 },
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
  [RECOMMENDED_SERVICES.parenting]: [ANJA, MARIJA],
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
    answers.reason === REASONS.adolescent
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
  [REASONS.addiction]: "Radi sa temom zavisnosti.",
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
  [REASONS.addiction]: ["zavisnost"],
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

  if (
    answers.format === WORK_FORMATS.inPerson &&
    (answers.location === profile.inPersonCity ||
      answers.location === LOCATIONS.other)
  ) {
    sentences.push(
      answers.location === profile.inPersonCity
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

  // Format/location constraints. In-person in a specific city is a hard
  // filter; „Druga lokacija" keeps everyone but flags the online fallback.
  let eligible: Slug[] = [...ALL_SLUGS];
  let onlineFallback = false;
  if (answers.format === WORK_FORMATS.inPerson) {
    if (answers.location === LOCATIONS.nis) {
      eligible = ALL_SLUGS.filter(
        (slug) => therapistMatchingConfig[slug].inPersonCity === "Niš",
      );
    } else if (answers.location === LOCATIONS.leskovac) {
      eligible = ALL_SLUGS.filter(
        (slug) => therapistMatchingConfig[slug].inPersonCity === "Leskovac",
      );
    } else if (answers.location === LOCATIONS.other) {
      onlineFallback = true; // all three online — never "no therapist"
    }
  }

  // Age rule (Anja, 2026-07-20): each therapist has a minimum child age.
  // Marija works with all ages; Anja and Marjan only with 16+. A therapist is
  // eligible when the child's bracket meets their minimum. If the city filter
  // already excluded everyone who works with this age, fall back to online
  // with any qualifying therapist rather than returning nobody.
  if (
    answers.participants === PARTICIPANTS.parentChild &&
    answers.childAgeGroup !== null
  ) {
    const bracketMinAge = CHILD_AGE_MIN_AGE[answers.childAgeGroup] ?? 18;
    const worksWithAge = (slug: Slug) =>
      bracketMinAge >= therapistMatchingConfig[slug].minChildAge;
    const ageEligible = eligible.filter(worksWithAge);
    if (ageEligible.length > 0) {
      eligible = ageEligible;
    } else {
      eligible = ALL_SLUGS.filter(worksWithAge);
      onlineFallback = true;
    }
  }

  const service = recommendService(answers);
  const needsManualReview = answers.reason === REASONS.other;

  const ranked = eligible
    .map((slug) => ({ slug, score: scores[slug] }))
    .sort(
      (a, b) =>
        b.score - a.score ||
        ALL_SLUGS.indexOf(a.slug) - ALL_SLUGS.indexOf(b.slug),
    );

  const toMatch = (slug: Slug): TherapistMatch => ({
    therapist: therapistBySlug(slug),
    reasons: buildReasons(slug, answers, service),
  });

  const recommendedTherapists = ranked.map((entry) => toMatch(entry.slug));
  const primary = recommendedTherapists[0] ?? null;
  const alternative = recommendedTherapists[1] ?? null;
  const showBoth =
    ranked.length > 1 && (ranked[0]?.score ?? 0) - (ranked[1]?.score ?? 0) < 3;

  return {
    recommendedTherapists,
    primaryRecommendation: primary,
    alternativeRecommendation: alternative,
    showBoth,
    recommendedService: service,
    onlineFallback,
    needsManualReview,
    scoreBreakdown: scores,
  };
}
