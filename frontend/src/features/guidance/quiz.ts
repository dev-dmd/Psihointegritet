import type { Therapist } from "@/types/therapist";

/**
 * Deterministic guided-selection quiz from the design handoff. Answers live
 * only in client memory — they are never persisted or sent anywhere.
 */

export interface QuizStep {
  question: string;
  options: string[];
}

export const quizSteps: QuizStep[] = [
  {
    question: "Za koga tražite podršku?",
    options: [
      "Za sebe",
      "Za partnerski odnos",
      "Kao roditelj",
      "Za adolescenta",
      "Tražim radionicu ili edukaciju",
    ],
  },
  {
    question: "Šta vam je trenutno najvažnije?",
    options: [
      "Stres i iscrpljenost",
      "Odnosi i komunikacija",
      "Anksioznost ili emocionalne teškoće",
      "Samopouzdanje i granice",
      "Roditeljstvo",
      "Lični razvoj",
      "Nisam siguran/na",
    ],
  },
  {
    question: "Koji način rada vam odgovara?",
    options: ["Online", "Uživo", "Svejedno"],
  },
  {
    question: "Kada vam najčešće odgovara termin?",
    options: ["Pre podne", "Posle podne", "Uveče", "Fleksibilno"],
  },
  {
    question: "Šta želite da vidite?",
    options: [
      "Nekoliko predloženih terapeuta",
      "Sve dostupne terapeute",
      "Usluge i programe",
    ],
  },
];

export type QuizAnswers = (string | null)[];

export const SHOW_SERVICES_ANSWER = "Usluge i programe";

const ANJA = "anja-stamenkovic";
const MARIJA = "marija-stamenkovic";
const MARJAN = "marjan-jankovic";

const allTherapistSlugs = [ANJA, MARIJA, MARJAN];

/** Targeting reviewed against each therapist's actual areas of work (CTO, 2026-07-17). */
const topicToTherapistSlugs: Record<string, string[]> = {
  "Stres i iscrpljenost": [MARJAN, ANJA],
  "Odnosi i komunikacija": [ANJA, MARJAN],
  "Anksioznost ili emocionalne teškoće": [ANJA, MARIJA],
  "Samopouzdanje i granice": [MARIJA, MARJAN],
  Roditeljstvo: [ANJA, MARIJA],
  "Lični razvoj": [ANJA, MARJAN],
};

export function wantsServices(answers: QuizAnswers): boolean {
  return answers[4] === SHOW_SERVICES_ANSWER;
}

export function recommendTherapistSlugs(answers: QuizAnswers): string[] {
  const who = answers[0] ?? null;
  const topic = answers[1] ?? null;

  if (answers[4] === "Sve dostupne terapeute") {
    return allTherapistSlugs;
  }
  if (who === "Za adolescenta") {
    return [MARIJA];
  }
  if (who === "Za partnerski odnos") {
    return [ANJA, MARJAN];
  }
  if (who === "Kao roditelj") {
    return [ANJA, MARIJA];
  }
  return topicToTherapistSlugs[topic ?? ""] ?? allTherapistSlugs;
}

export function recommendTherapists(
  answers: QuizAnswers,
  all: Therapist[],
): Therapist[] {
  return recommendTherapistSlugs(answers)
    .map((slug) => all.find((therapist) => therapist.slug === slug))
    .filter((therapist): therapist is Therapist => therapist !== undefined);
}
