/**
 * Therapist profile shape shared by the team pages, the homepage section and
 * the guided-selection drawer. `src/content/therapists.ts` is the single
 * source of truth — never re-declare therapist data locally.
 *
 * Content status is `draft` until each therapist confirms their exact title in
 * writing (master plan T3 / STOP S1). Credential lines must stay generic until
 * then, so this type deliberately has no `credentials` field yet.
 */

export interface TherapistService {
  title: string;
  /** Null when the service has no fixed duration — never invent one (T7/S3). */
  duration: string | null;
  /** Null when the price is not confirmed — never invent one (T7/S3). */
  price: string | null;
}

export interface Therapist {
  /** Route slug: /tim/[slug]. Fixed by master plan §5 R1.1 + decision D-006. */
  slug: string;
  name: string;
  /** Accusative case for the „Upoznaj {nameAccusative}" CTA. */
  nameAccusative: string;
  /** Nominative, e.g. „Usluge koje pruža {firstName}". */
  firstName: string;
  /** Instrumental case, for „razgovor sa {firstNameInstrumental}" — Anja → Anjom. */
  firstNameInstrumental: string;
  initials: string;
  /** Generic until S1 — no „pod supervizijom", no unconfirmed certifications. */
  title: string;
  badge: string;
  quote: string;
  formats: string;
  /** City the therapist works from in person, nominative case (T8). */
  city: string;
  /** Locative case of `city`, for „uživo u {cityLocative}" — Niš → Nišu. */
  cityLocative: string;
  areas: string[];
  services: TherapistService[];
  image: string;
  cardExcerpt: string;
  /** Full bio, paragraph by paragraph. Never truncated on the profile page. */
  bio: string[];
}
