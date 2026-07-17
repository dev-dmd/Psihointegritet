import { therapists } from "@/content/therapists";
import type { Therapist } from "@/types/therapist";

/**
 * Intake & Matching Engine v1 — deterministic, explainable, non-diagnostic
 * (master plan T13). Answers live only in client memory; they are never
 * persisted, sent or logged (§11). No numeric scores — every shown therapist
 * gets plain-language reasons instead.
 *
 * The routing matrix below is engine configuration, deliberately separate from
 * the public profile content in `content/therapists.ts`. Rules are hardcoded
 * v1 drafts pending team confirmation (see OPEN_DECISIONS): whether Anja
 * accepts 16–17, Marjan's minimum age, per-therapist capacity. Until then:
 * minors route to Marija only, and Marjan is 18+.
 */

export interface MatchingStep {
  question: string;
  options: string[];
}

export const AUDIENCE = {
  self: "Za mene — odrasla osoba",
  adolescent: "Za adolescenta",
  couple: "Za par ili partnerski odnos",
  parent: "Podrška roditelju",
  b2b: "Rad sa kompanijama",
} as const;

export const AGE_GROUPS = ["13–15", "16–17", "18–25", "26–45", "46+"] as const;
export type AgeGroup = (typeof AGE_GROUPS)[number];
const MINOR_AGE_GROUPS: readonly AgeGroup[] = ["13–15", "16–17"];

export const AREAS = {
  stress: "Stres i anksioznost",
  emotions: "Emocije i samopouzdanje",
  relationships: "Odnosi i životne promene",
  parenting: "Roditeljstvo",
  adolescence: "Izazovi adolescencije",
  crisisRecovery: "Oporavak nakon nasilja ili kriznog iskustva",
  growth: "Lični rast i razvoj",
  unsure: "Nisam siguran/na",
} as const;

export const FORMATS = {
  online: "Online",
  nis: "Uživo — Niš",
  leskovac: "Uživo — Leskovac",
  any: "Svejedno",
} as const;

export const PRIORITIES = {
  bestFit: "Najbolje stručno uklapanje",
  earliest: "Najraniji dostupan termin",
  moreOptions: "Želim da vidim više predloga",
  teamConfirms: "Želim da tim potvrdi izbor",
  specific: "Želim konkretnog terapeuta",
} as const;

export const matchingSteps: MatchingStep[] = [
  {
    question: "Za koga tražite podršku?",
    options: Object.values(AUDIENCE),
  },
  {
    question: "Kojoj uzrasnoj grupi pripada osoba?",
    options: [...AGE_GROUPS],
  },
  {
    question: "Koja oblast je trenutno najvažnija?",
    options: Object.values(AREAS),
  },
  {
    question: "Koji format vam odgovara?",
    options: Object.values(FORMATS),
  },
  {
    question: "Šta vam je najvažnije pri izboru?",
    options: Object.values(PRIORITIES),
  },
];

export type MatchingAnswers = (string | null)[];

/** Draft safety copy — final wording is blocked on legal review (STOP S5). */
export const SAFETY_NOTICE =
  "Vođeni izbor ne postavlja dijagnozu i nije hitna služba. Ako vam je potrebna pomoć koja ne može da čeka redovan termin, pogledajte dostupne opcije za neposrednu podršku.";

/** T10: minors never get self-service booking — appointments go through a parent/guardian. */
export const MINOR_NOTE =
  "Termini za maloletnike dogovaraju se isključivo uz roditelja ili staratelja.";

type AreaKey = keyof typeof AREAS;
type City = "Niš" | "Leskovac";

interface MatchingProfile {
  slug: string;
  /** Confirmed minimum age (S-list: Marjan's adolescent boundary unconfirmed → 18). */
  minAge: 13 | 18;
  worksWithCouples: boolean;
  worksWithParents: boolean;
  areas: readonly AreaKey[];
  city: City;
}

/** v1 routing matrix — order in this array is the deterministic tiebreaker. */
const MATCHING_PROFILES: readonly MatchingProfile[] = [
  {
    slug: "anja-stamenkovic",
    minAge: 18,
    worksWithCouples: true,
    worksWithParents: true,
    areas: ["stress", "emotions", "relationships", "parenting", "growth"],
    city: "Niš",
  },
  {
    slug: "marija-stamenkovic",
    minAge: 13,
    worksWithCouples: false,
    worksWithParents: true,
    areas: ["emotions", "adolescence", "parenting", "growth", "relationships"],
    city: "Leskovac",
  },
  {
    slug: "marjan-jankovic",
    minAge: 18,
    worksWithCouples: true,
    worksWithParents: false,
    areas: ["relationships", "stress", "growth"],
    city: "Leskovac",
  },
];

export interface TherapistMatch {
  therapist: Therapist;
  /** Plain-language reasons — never a numeric score. */
  reasons: string[];
}

export type MatchResult =
  | {
      kind: "match";
      primary: TherapistMatch;
      alternatives: TherapistMatch[];
      minorNote: boolean;
      earliestNote: boolean;
    }
  | { kind: "team" }
  | { kind: "b2b" };

function areaKeyForAnswer(answer: string | null): AreaKey | null {
  const entry = Object.entries(AREAS).find(([, label]) => label === answer);
  return entry ? (entry[0] as AreaKey) : null;
}

function therapistBySlug(slug: string): Therapist {
  const found = therapists.find((therapist) => therapist.slug === slug);
  if (!found) {
    throw new Error(`Matching profile references unknown therapist: ${slug}`);
  }
  return found;
}

function buildReasons(
  profile: MatchingProfile,
  areaKey: AreaKey | null,
  format: string | null,
): string[] {
  const reasons = ["radi sa ovom uzrasnom grupom"];
  if (areaKey !== null && profile.areas.includes(areaKey)) {
    reasons.push("oblast rada odgovara izabranim potrebama");
  }
  if (format === FORMATS.online) {
    reasons.push("radi online");
  } else if (format === FORMATS.nis || format === FORMATS.leskovac) {
    reasons.push(`radi uživo u ${therapistBySlug(profile.slug).cityLocative}`);
  } else {
    reasons.push("radi online i uživo");
  }
  return reasons;
}

/**
 * Deterministic recommendation. Hard filters exclude completely; survivors are
 * ranked by primary-area match, then matrix order. Branches that skip matching
 * entirely: B2B, crisis recovery (never auto-routed — needs human review, per
 * spec), explicit team confirmation, minors outside Marija's scope, or an
 * empty survivor set.
 */
export function recommendMatch(answers: MatchingAnswers): MatchResult {
  const [audience, ageGroup, area, format, priority] = answers;

  if (audience === AUDIENCE.b2b) {
    return { kind: "b2b" };
  }

  // Crisis/violence recovery is flagged for professional review — never
  // auto-assigned to a therapist just because it appears in a bio (spec §matrix).
  if (area === AREAS.crisisRecovery) {
    return { kind: "team" };
  }

  if (priority === PRIORITIES.teamConfirms) {
    return { kind: "team" };
  }

  const isMinor = MINOR_AGE_GROUPS.includes((ageGroup ?? "") as AgeGroup);
  const areaKey = areaKeyForAnswer(area ?? null);

  let eligible = MATCHING_PROFILES.filter((profile) => {
    if (isMinor && profile.minAge > 15) {
      // Only Marija works with adolescents until the team confirms boundaries.
      return profile.minAge === 13;
    }
    if (audience === AUDIENCE.adolescent && profile.minAge > 15) {
      return false;
    }
    if (audience === AUDIENCE.couple && !profile.worksWithCouples) {
      return false;
    }
    if (audience === AUDIENCE.parent && !profile.worksWithParents) {
      return false;
    }
    if (format === FORMATS.nis && profile.city !== "Niš") {
      return false;
    }
    if (format === FORMATS.leskovac && profile.city !== "Leskovac") {
      return false;
    }
    return true;
  });

  // If the hard filters left no one (e.g. adolescent + uživo Niš), there is no
  // reliable result — the team takes over.
  if (eligible.length === 0) {
    return { kind: "team" };
  }

  // Rank: primary-area match first, matrix order as the stable tiebreaker.
  if (areaKey !== null) {
    eligible = [...eligible].sort((a, b) => {
      const aHit = a.areas.includes(areaKey) ? 0 : 1;
      const bHit = b.areas.includes(areaKey) ? 0 : 1;
      return aHit - bHit;
    });
  }

  const showAll =
    priority === PRIORITIES.moreOptions || priority === PRIORITIES.specific;
  const shown = showAll ? eligible : eligible.slice(0, 3);

  const [primaryProfile, ...alternativeProfiles] = shown;
  if (!primaryProfile) {
    return { kind: "team" };
  }

  const toMatch = (profile: MatchingProfile): TherapistMatch => ({
    therapist: therapistBySlug(profile.slug),
    reasons: buildReasons(profile, areaKey, format ?? null),
  });

  return {
    kind: "match",
    primary: toMatch(primaryProfile),
    alternatives: alternativeProfiles.slice(0, 2).map(toMatch),
    // The parent/guardian note follows the age group, not the Q1 label — an
    // 18+ adolescent is legally an adult (T10 applies to minors only).
    minorNote: isMinor,
    earliestNote: priority === PRIORITIES.earliest,
  };
}
