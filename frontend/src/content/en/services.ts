import type {
  ServiceCatalogItem,
  SessionPackage,
  SupportArea,
} from "@/content/services";

/**
 * English fallback for the service catalogue — a **placeholder**, not a
 * translation of anyone's words.
 *
 * Slugs, prices, durations and hrefs are **identity, not copy**: they address
 * routes, booking services and amounts, and translating them would point at
 * things that do not exist. Only the prose differs from the Serbian file.
 */
export const serviceCatalog: ServiceCatalogItem[] = [
  {
    slug: "individualna-psihoterapija",
    name: "Individual psychotherapy",
    description:
      "A space to explore what weighs on you at your own pace — with a therapist's support and a gestalt approach that encourages awareness, authenticity and responsibility for your own life.",
    duration: "60 minutes",
    priceAmount: 4000,
    format: "online or in person",
    audience:
      "For people who want to explore what troubles them with a therapist's support.",
    firstStep:
      "Send a request for an appointment, then arrange the first conversation with the therapist.",
  },
  {
    slug: "bracno-savetovanje",
    name: "Couples counselling",
    description:
      "Working together on communication, closeness and the patterns that keep repeating in a relationship.",
    duration: "90 minutes",
    priceAmount: 5500,
    format: "online or in person",
    audience:
      "For couples who want to work on communication, closeness and the patterns in their relationship.",
    firstStep:
      "Send a joint request for an appointment, then arrange the first conversation with the therapist.",
  },
  {
    slug: "roditeljsko-savetovanje",
    name: "Parenting counselling",
    description:
      "Advisory support for parents in understanding their child and strengthening the relationship, at every age.",
    duration: "60 minutes",
    priceAmount: 5000,
    format: "online or in person",
    audience:
      "For parents who want support in understanding their child and strengthening the relationship.",
    firstStep:
      "Send a request for an appointment, then arrange the first conversation with the therapist.",
  },
];

/** Mandatory price disclaimer (T7). */
export const PRICE_NOTE: string =
  "Prices are indicative and serve as a guide. The exact appointment and terms are agreed directly with the therapist.";

export const sessionPackages: SessionPackage[] = [
  {
    sessions: 5,
    deadline: "to be used within 3 months",
    priceAmount: 15000,
    fullPriceAmount: 20000,
  },
  { sessions: 10, deadline: "to be used within 5 months", priceAmount: 38000 },
];

export const supportAreas: SupportArea[] = [
  {
    title: "Support for adolescents",
    description:
      "Individual work adapted to young people and their pace, agreed with a parent or guardian.",
    href: "/tim",
  },
  {
    title: "Support for parents",
    description:
      "Advisory support for parents through the challenges of the parenting role, at every stage.",
    href: "/podrska-roditeljima",
  },
  {
    title: "Workshops",
    description:
      "Group experiential learning through the gestalt approach — announcements and expressions of interest.",
    href: "/radionice",
  },
];
