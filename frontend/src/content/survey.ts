/**
 * Research survey ("Podelite mišljenje") — a separate module from the guided
 * matching engine (spec §17). It collects anonymous opinions about online vs.
 * in-person support; it never influences a match and asks for no health data.
 *
 * The `surveyId` lets one ResearchDrawer serve several future surveys and is
 * echoed by the `?survey=` query param that auto-opens the drawer.
 */

export const ONLINE_EXPERIENCE_SURVEY_ID = "online-experience";

export interface SurveyStep {
  question: string;
  options: string[];
}

export const surveyIntro = {
  title: "Pomozite nam da oblikujemo bolje iskustvo podrške",
  description:
    "Odgovorite na nekoliko kratkih pitanja o online i radu uživo. Anketa traje oko jednog minuta, anonimna je i ne traži privatne informacije.",
  cta: "Započni anketu",
} as const;

export const surveySteps: SurveyStep[] = [
  {
    question: "Da li ste ranije koristili psihološku podršku?",
    options: ["Da, uživo", "Da, online", "Ne, nikad", "Ne želim da kažem"],
  },
  {
    question: "Šta vam deluje lakše za prvi razgovor?",
    options: ["Online", "Uživo", "Svejedno", "Nisam siguran/na"],
  },
  {
    question: "Koliko imate poverenja u ovakve online platforme za podršku?",
    options: ["Veliko", "Umereno", "Malo", "Nemam poverenja"],
  },
  {
    question: "Šta vas najviše koči da potražite podršku?",
    options: [
      "Cena",
      "Stid ili strah od osude",
      "Nedostatak vremena",
      "Ne znam kome da se obratim",
      "Ništa me posebno ne koči",
    ],
  },
];

export type SurveyAnswers = (string | null)[];
