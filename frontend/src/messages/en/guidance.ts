export const guidance = {
  chooser: {
    title: "How would you like to find an appointment?",
    description: "Choose the option that suits you best.",
    guidedTitle: "Help me find a therapist",
    guidedDescription:
      "Answer a few short questions and get a suggestion right away.",
    directLabel: "I know which therapist I want",
  },
} as const;

export type EnGuidance = typeof guidance;
