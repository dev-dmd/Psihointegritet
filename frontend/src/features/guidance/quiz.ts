import type { TherapistProfile } from "@/content/homepage";

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

const allTherapistIds = ["as", "ms", "mj"];

const topicToTherapistIds: Record<string, string[]> = {
  "Stres i iscrpljenost": ["as", "mj"],
  "Odnosi i komunikacija": ["mj", "as"],
  "Anksioznost ili emocionalne teškoće": ["ms", "mj"],
  "Samopouzdanje i granice": ["ms", "as"],
  Roditeljstvo: ["as", "ms"],
  "Lični razvoj": ["mj", "ms"],
};

export function wantsServices(answers: QuizAnswers): boolean {
  return answers[4] === SHOW_SERVICES_ANSWER;
}

export function recommendTherapistIds(answers: QuizAnswers): string[] {
  const who = answers[0] ?? null;
  const topic = answers[1] ?? null;

  if (answers[4] === "Sve dostupne terapeute") {
    return allTherapistIds;
  }
  if (who === "Za adolescenta") {
    return ["ms"];
  }
  if (who === "Za partnerski odnos") {
    return ["as", "mj"];
  }
  if (who === "Kao roditelj") {
    return ["as", "ms"];
  }
  return topicToTherapistIds[topic ?? ""] ?? allTherapistIds;
}

export function recommendTherapists(
  answers: QuizAnswers,
  all: TherapistProfile[],
): TherapistProfile[] {
  return recommendTherapistIds(answers)
    .map((id) => all.find((therapist) => therapist.id === id))
    .filter(
      (therapist): therapist is TherapistProfile => therapist !== undefined,
    );
}
