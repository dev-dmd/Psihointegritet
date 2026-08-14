export const publicUi = {
  brand: { tagline: "Digital center for mental health" },
  navigation: {
    mainLabel: "Main navigation",
    quickLabel: "Quick navigation",
    mobileLabel: "Mobile navigation",
    menuLabel: "Menu",
    openMenu: "Open menu",
    closeMenu: "Close menu",
    book: "Book an appointment",
    links: {
      support: "Find support",
      therapists: "Therapists",
      services: "Services",
      workshops: "Workshops",
      knowledge: "Knowledge and resources",
      compass: "Compass",
      about: "About us",
      parents: "Support for parents",
      prices: "Prices",
      team: "Team",
      companies: "For organizations",
      contact: "Contact",
    },
  },
  footer: {
    description:
      "A digital center for mental health. Psychotherapy, counselling, workshops and educational resources in one place.",
    formats: "{locations} · online and in person",
    supportGroup: "Support",
    organizationGroup: "Psihointegritet",
    rights: "© 2026 Psihointegritet. All rights reserved.",
    disclaimer:
      "The resources on this site are educational and do not replace an individual conversation with a qualified professional.",
  },
} as const;

export type EnPublicUi = typeof publicUi;
