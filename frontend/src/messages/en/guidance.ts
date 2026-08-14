export const guidance = {
  flow: {
    dialogLabel: "Guided support selection",
    intro: {
      eyebrow: "Guided selection",
      title: "Find support that suits you",
      description:
        "Answer a few short questions so we can suggest a therapist and way of working that may suit your needs based on their areas of work and experience.",
      note: "This questionnaire is not a diagnostic tool and does not provide a diagnosis. The suggestion is intended to support your choice and is not a professional assessment.",
      start: "Start the questionnaire",
      browseTherapists: "Explore therapists yourself",
      book: "Book an appointment",
    },
  },
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
