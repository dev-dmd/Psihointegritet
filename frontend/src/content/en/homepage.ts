import type {
  ClientLink,
  CompaniesContent,
  FaqItem,
  FirstSessionStep,
  NavLink,
  ReasonCard,
  ResourceArticle,
  TrustItem,
  WorkshopFact,
} from "@/content/homepage";

/**
 * English fallback for the homepage — a **placeholder**, not a translation of
 * anyone's words. It shows an administrator what each field is for, at the
 * length the design expects, and disappears the moment they write their own.
 *
 * `href` values, icon keys and ids are **identity, not copy**: they address
 * routes and components, and translating them would point at nothing.
 */
export const companies: CompaniesContent = {
  eyebrow: "For organizations",
  title: "Working with companies",
  description:
    "Workshops, training and psychological support for teams and employees.",
  action: { label: "Learn more", href: "/rad-sa-kompanijama" },
};

export const clientLink: ClientLink = {
  prefix: "Already a client?",
  label: "Book your next appointment",
  href: "/zakazi?source=homepage",
};

export const footerServiceLinks: NavLink[] = [
  {
    label: "Individual psychotherapy",
    href: "/usluge/individualna-psihoterapija",
  },
  { label: "Couples counselling", href: "/usluge/bracno-savetovanje" },
  { label: "Parenting counselling", href: "/usluge/roditeljsko-savetovanje" },
  { label: "Workshops", href: "/radionice" },
];

export const trustItems: TrustItem[] = [
  { icon: "screen", label: "Online and in person" },
  { icon: "pin", label: "Chicago, Milwaukee, Madison and online" },
  { icon: "people", label: "Individual and couples work" },
  { icon: "shield", label: "Confidentiality and expertise" },
];

export const reasons: ReasonCard[] = [
  {
    number: "01",
    title: "Stress and burnout",
    description:
      "When exhaustion becomes everyday life and rest no longer helps.",
    href: "/pronadji-podrsku",
  },
  {
    number: "02",
    title: "Couple relationships",
    description:
      "Communication, closeness, conflict and the phases a relationship moves through.",
    href: "/pronadji-podrsku",
  },
  {
    number: "03",
    title: "Anxiety and emotional difficulties",
    description: "Worry, tension and feelings that are hard to name.",
    href: "/pronadji-podrsku",
  },
  {
    number: "04",
    title: "Parenting",
    description:
      "Support through the challenges of the parenting role and the relationship with your child.",
    href: "/podrska-roditeljima",
  },
  {
    number: "05",
    title: "Self-confidence and boundaries",
    description: "Standing up for yourself more clearly, without guilt.",
    href: "/pronadji-podrsku",
  },
  {
    number: "06",
    title: "Support for young people",
    description: "A safe space for young people through a period of change.",
    href: "/tim",
  },
];

export const firstSessionSteps: FirstSessionStep[] = [
  {
    number: "01",
    title: "Getting to know each other",
    description:
      "We talk about the reason you are here and what is currently weighing on you.",
  },
  {
    number: "02",
    title: "Expectations and questions",
    description:
      "We explore what you expect from therapy. You can ask anything you want to know.",
  },
  {
    number: "03",
    title: "Next steps",
    description:
      "The therapist explains how the work goes and the rules of confidentiality, and together you agree what comes next.",
  },
];

export const workshopFacts: WorkshopFact[] = [
  { label: "Duration", value: "3 hours" },
  { label: "Format", value: "Group work in person" },
  { label: "Intended for", value: "Anyone, no experience needed" },
];

export const resources: ResourceArticle[] = [
  {
    category: "Stress and burnout",
    title: "How to recognise burnout before it becomes a serious problem",
    description:
      "Burnout does not appear all at once. It is usually preceded by lasting fatigue, lost motivation, irritability and the sense of not recovering even after rest. Learn which early signals should not be ignored.",
  },
  {
    category: "Psychotherapy",
    title:
      "Why you do not need to reach breaking point before asking for support",
    description:
      "Psychotherapy is not reserved for a crisis. A conversation with a therapist can be a space for understanding yourself, your relationships and the patterns you want to change.",
  },
  {
    category: "Boundaries and relationships",
    title: "Setting boundaries without feeling guilty",
    description:
      "Boundaries are not a rejection of others but a way to protect your needs, your time and your emotional space. Explore why guilt appears and how to say more clearly what matters to you.",
  },
];

export const faqItems: FaqItem[] = [
  {
    id: "poverljivost",
    question: "Is everything I say confidential?",
    answer:
      "Yes. All information stays between client and therapist, except in situations prescribed by law and the code of ethics.",
  },
  {
    id: "trajanje",
    question: "How long does therapy last?",
    answer:
      "It depends on your goals and needs. Some people come for a few months, others choose a longer process.",
  },
  {
    id: "online",
    question: "Can I work online?",
    answer: "Yes. Every service is available online as well.",
  },
  {
    id: "izbor-terapeuta",
    question: "How do I know which therapist suits me?",
    answer:
      "The therapist profiles describe their approach, experience and areas of work, and you can always contact us for a recommendation.",
  },
  {
    id: "dijagnoza",
    question: "Do I need a diagnosis to start therapy?",
    answer:
      "No. Psychotherapy is for anyone who wants to understand themselves better or is going through a demanding period.",
  },
];
