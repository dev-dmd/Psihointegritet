/**
 * Workspace screens outside the shell (I18N-5).
 *
 * Screen chrome only — greetings, headings and the notes that explain what a
 * panel does. Demo data and anything a tenant writes stays where it is.
 */
export const screens = {
  overview: {
    morning: "Good morning",
    afternoon: "Good afternoon",
    evening: "Good evening",
    lead: "Here is what needs your attention today.",
    errors: "Errors that need your attention ({count, number})",
    dismissError: "Dismiss error: {title}",
    todaySchedule: "Today's schedule",
    research: "Research",
    newResponses: "+{count, number} new responses this week",
    surveyProgress: "{survey} · completion {rate}",
  },
  profile: {
    internalLabel: "Internal.",
    internalNote:
      "These preferences are read only by the Matching engine — they do not appear in the public biography.",
    acceptsHeading: "Who they accept",
    maxNewMonthly: "Max new per month",
    onlineOrInPerson: "Online / in person",
  },
} as const;

export type EnScreens = typeof screens;
