import type { Therapist } from "@/types/therapist";

/**
 * English fallback for the therapist catalogue.
 *
 * A **placeholder**, not a translation of anyone's words. The Serbian file is
 * the tenant's own text; this exists so an English organization's administrator
 * opens the CMS and sees what each field is for, at roughly the length the
 * design expects. Every value here is overwritten the moment they write their
 * own — and until they do, `content:check` holds it to the same character
 * limits, which is why `cardExcerpt` stays under the 170 that doubles as the
 * SEO description.
 *
 * Names, slugs, images and booking service slugs are **identity, not copy**:
 * they are byte-identical to the Serbian file. Translating them would point at
 * routes and images that do not exist.
 */
export const therapists: Therapist[] = [
  {
    slug: "maria-bullock",
    name: "Maria Bullock",
    // Serbian grammar fields are inert in English but must stay populated —
    // the type has no optional members, and an English organization that later
    // switches content locale would otherwise render a name without a case.
    nameAccusative: "Maria",
    firstName: "Maria",
    firstNameGenitive: "Maria",
    firstNameInstrumental: "Maria",
    initials: "MB",
    title:
      "Founder of Psihointegritet · Social worker and certified gestalt psychotherapist",
    badge: "Founder",
    quote:
      "My approach draws on gestalt psychotherapy, which encourages awareness, authenticity and taking responsibility for one's own life.",
    formats: "Individual work · Couples work · Online and in person",
    city: "Chicago",
    cityLocative: "Chicago",
    cityRegion: "Illinois",
    cityRegionCode: "IL",
    areas: [
      "Anxiety and depression",
      "Burnout",
      "Couple relationships",
      "Parenting",
      "Personal growth",
      "Working with emotions",
    ],
    additionalServices: [],
    bookingServiceSlugs: [
      "individualna-psihoterapija",
      "bracno-savetovanje",
      "roditeljsko-savetovanje",
    ],
    image: "/images/therapists/maria-profile-pic.webp",
    cardExcerpt:
      "Through individual and couples work I support people who want to understand themselves better and find healthier ways to cope.",
    bio: [
      "Through individual and couples work I support people who want to understand themselves better, improve the quality of their relationships, and find healthier ways to cope with life's challenges.",
      "I am particularly interested in emotional development, couple relationships, parenting, burnout, transgenerational patterns and personal growth.",
      "My approach draws on gestalt psychotherapy, which encourages awareness, authenticity and taking responsibility for one's own life.",
    ],
  },
  {
    slug: "elsa-browers",
    name: "Elsa Browers",
    nameAccusative: "Elsa",
    firstName: "Elsa",
    firstNameGenitive: "Elsa",
    firstNameInstrumental: "Elsa",
    initials: "EB",
    title: "Pedagogue and certified gestalt psychotherapist",
    badge: "Adolescents and adults",
    quote:
      "I support adolescents and adults in personal development, emotional difficulties and improving their relationships with others.",
    formats: "Individual work · Adolescents and adults · Online and in person",
    city: "Milwaukee",
    cityLocative: "Milwaukee",
    cityRegion: "Wisconsin",
    cityRegionCode: "WI",
    areas: [
      "Adolescents",
      "Self-confidence",
      "Emotional difficulties",
      "Relationships",
      "Identity development",
      "Working with emotions",
    ],
    additionalServices: [
      { title: "Adolescent counselling", duration: null, price: null },
    ],
    bookingServiceSlugs: [
      "individualna-psihoterapija",
      "roditeljsko-savetovanje",
    ],
    image: "/images/therapists/elsa-profile-pic.webp",
    cardExcerpt:
      "I work with adolescents and adults through individual psychotherapy, supporting personal development and relationships with others.",
    bio: [
      "I work with adolescents and adults through individual psychotherapeutic work, offering support in personal development, emotional difficulties and the improvement of interpersonal relationships.",
    ],
  },
  {
    slug: "john-francis",
    name: "John Francis",
    nameAccusative: "John",
    firstName: "John",
    firstNameGenitive: "John",
    firstNameInstrumental: "John",
    initials: "JF",
    title: "Psychologist and certified gestalt psychotherapist",
    badge: "Individual work and couples",
    quote:
      "I am particularly interested in emotional regulation, the development of couple relationships, stress and personal growth.",
    formats: "Individual work · Couples work · Online and in person",
    city: "Madison",
    cityLocative: "Madison",
    cityRegion: "Wisconsin",
    cityRegionCode: "WI",
    areas: [
      "Couple relationships",
      "Emotional regulation",
      "Stress",
      "Personal growth",
      "Self-esteem",
    ],
    additionalServices: [],
    bookingServiceSlugs: ["individualna-psihoterapija", "bracno-savetovanje"],
    image: "/images/therapists/john-profile-pic.webp",
    cardExcerpt:
      "I work with adults and couples, with a particular interest in emotional regulation, stress and personal growth.",
    bio: [
      "I work with adults and couples, with a particular interest in emotional regulation, the development of couple relationships, stress and personal growth.",
    ],
  },
];
