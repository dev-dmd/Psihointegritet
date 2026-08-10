import type { Therapist } from "@/types/therapist";

/**
 * Single source of truth for therapist data — the team pages, the homepage
 * section, the site footer and the guided-selection drawer all read from here.
 *
 * Content is a fallback layer (D-038): the CMS overrides any field the team
 * fills in, and nothing here is deleted when it does.
 *
 * - **Team as of 2026-08-10 (D-074).** Maria Bullock, Elsa Browers and John
 *   Francis replace Anja Stamenković, Marija Stamenković and Marjan Janković.
 *   D-074 provisioned the accounts and the matching profiles but explicitly
 *   left this public catalog out, because biographies, titles and areas of
 *   expertise are claims about named professionals and needed text from the
 *   owner. That text arrived (`psihointegritet_en.pdf`, 2026-08-10) and is
 *   what this file now carries.
 * - Each incoming person keeps the *matching attributes* of the person they
 *   replace, per D-074: Maria ← Anja, Elsa ← Marija, John ← Marjan. That is
 *   why `areas`, `bookingServiceSlugs` and `additionalServices` are unchanged —
 *   the owner's material lists the same areas of work, and a slot that stops
 *   matching would make the person invisible to guided selection.
 * - Cities are **not** inherited (D-076): the centre works from Chicago (IL),
 *   Milwaukee (WI) and Madison (WI). Niš and Leskovac are gone from every
 *   surface, including the booking location picker and the guided-selection
 *   filter, which compare the answer against these values.
 * - Titles state certification, per D-042 / STOP S1 and §4 R0.2. The owner's
 *   material writes „pod supervizijom" for all three; that wording is
 *   deliberately not used here (CTO, 2026-08-10) and must not be reintroduced
 *   without a decision that reopens S1.
 * - Dialect is ekavica throughout, the site-wide default (T9). The ijekavica
 *   exception recorded under D-017 was personal to Anja and left with her.
 * - Bios are short on purpose: the owner's material calls its biography
 *   section a starting direction that will be expanded, and §6 R0 forbids
 *   inventing text about a named professional. `quote` and `cardExcerpt` for
 *   Elsa and John therefore restate the one paragraph they have rather than
 *   adding claims. Replace all three when the fuller texts arrive.
 * - Service names follow T1 („Bračno savetovanje", never „partnersko
 *   savetovanje" / „partnerska terapija"). „Psihoterapijsko savetovanje" was
 *   removed from the catalog (D-025) and must not reappear — the owner's
 *   material lists a „Psihološko savetovanje" that has no catalog entry, no
 *   backend service id and no booking route, so it is not offered here.
 * - Prices are „okvirne" wherever shown. A null duration/price means there is
 *   no confirmed figure — never invent one.
 */
export const therapists: Therapist[] = [
  {
    slug: "maria-bullock",
    name: "Maria Bullock",
    nameAccusative: "Mariju",
    firstName: "Maria",
    firstNameGenitive: "Marije",
    firstNameInstrumental: "Marijom",
    initials: "MB",
    title:
      "Osnivačica Psihointegriteta · Socijalni radnik i sertifikovana geštalt psihoterapeutkinja",
    badge: "Osnivačica",
    quote:
      "Moj pristup se oslanja na geštalt psihoterapiju, koja podstiče razvoj svesnosti, autentičnosti i preuzimanje odgovornosti za sopstveni život.",
    formats: "Individualni rad · Rad sa parovima · Online i uživo",
    city: "Chicago",
    cityLocative: "Chicagu",
    cityRegion: "Illinois",
    cityRegionCode: "IL",
    areas: [
      "Anksioznost i depresija",
      "Burnout",
      "Partnerski odnosi",
      "Roditeljstvo",
      "Lični razvoj",
      "Rad na emocijama",
    ],
    additionalServices: [],
    bookingServiceSlugs: [
      "individualna-psihoterapija",
      "bracno-savetovanje",
      "roditeljsko-savetovanje",
    ],
    image: "/images/therapists/maria-profile-pic.webp",
    // Doubles as the page's SEO description (limit 170) — keep it short enough
    // that Content Health stays green; the full sentence lives in `bio[0]`.
    cardExcerpt:
      "Kroz individualni rad i rad sa parovima pružam podršku ljudima koji žele bolje da razumeju sebe, unaprede kvalitet svojih odnosa i pronađu zdravije načine suočavanja.",
    bio: [
      "Kroz individualni rad i rad sa parovima pružam podršku ljudima koji žele bolje da razumeju sebe, unaprede kvalitet svojih odnosa i pronađu zdravije načine da se nose sa životnim izazovima.",
      "Posebno me zanimaju teme emocionalnog razvoja, partnerskih odnosa, roditeljstva, sagorevanja na poslu, transgeneracijskih obrazaca i ličnog rasta.",
      "Moj pristup se oslanja na geštalt psihoterapiju, koja podstiče razvoj svesnosti, autentičnosti i preuzimanje odgovornosti za sopstveni život.",
    ],
  },
  {
    slug: "elsa-browers",
    name: "Elsa Browers",
    nameAccusative: "Elsu",
    firstName: "Elsa",
    firstNameGenitive: "Else",
    firstNameInstrumental: "Elsom",
    initials: "EB",
    title: "Pedagog i sertifikovana geštalt psihoterapeutkinja",
    badge: "Adolescenti i odrasli",
    quote:
      "Podržavam adolescente i odrasle u ličnom razvoju, emocionalnim teškoćama i unapređenju odnosa sa drugima.",
    formats: "Individualni rad · Adolescenti i odrasli · Online i uživo",
    city: "Milwaukee",
    cityLocative: "Milwaukeeju",
    cityRegion: "Wisconsin",
    cityRegionCode: "WI",
    areas: [
      "Adolescenti",
      "Samopouzdanje",
      "Emocionalne teškoće",
      "Odnosi",
      "Razvoj identiteta",
      "Rad na emocijama",
    ],
    additionalServices: [
      { title: "Savetovanje adolescenata", duration: null, price: null },
    ],
    bookingServiceSlugs: [
      "individualna-psihoterapija",
      "roditeljsko-savetovanje",
    ],
    image: "/images/therapists/elsa-profile-pic.webp",
    cardExcerpt:
      "Radim sa adolescentima i odraslima kroz individualni psihoterapijski rad, pružajući podršku u ličnom razvoju, emocionalnim teškoćama i unapređenju međuljudskih odnosa.",
    bio: [
      "Radim sa adolescentima i odraslima kroz individualni psihoterapijski rad, pružajući podršku u ličnom razvoju, emocionalnim teškoćama i unapređenju međuljudskih odnosa.",
    ],
  },
  {
    slug: "john-francis",
    name: "John Francis",
    nameAccusative: "Johna",
    firstName: "John",
    firstNameGenitive: "Johna",
    firstNameInstrumental: "Johnom",
    initials: "JF",
    title: "Psiholog i sertifikovani geštalt psihoterapeut",
    badge: "Individualni rad i parovi",
    quote:
      "Posebno me zanimaju emocionalna regulacija, razvoj partnerskog odnosa, stres i lični razvoj.",
    formats: "Individualni rad · Rad sa parovima · Online i uživo",
    city: "Madison",
    cityLocative: "Madisonu",
    cityRegion: "Wisconsin",
    cityRegionCode: "WI",
    areas: [
      "Partnerski odnosi",
      "Emocionalna regulacija",
      "Stres",
      "Lični razvoj",
      "Samopoštovanje",
    ],
    additionalServices: [],
    bookingServiceSlugs: ["individualna-psihoterapija", "bracno-savetovanje"],
    image: "/images/therapists/john-profile-pic.webp",
    cardExcerpt:
      "Radim sa odraslima i parovima, sa posebnim interesovanjem za emocionalnu regulaciju, razvoj partnerskog odnosa, stres i lični razvoj.",
    bio: [
      "Radim sa odraslima i parovima, sa posebnim interesovanjem za emocionalnu regulaciju, razvoj partnerskog odnosa, stres i lični razvoj.",
    ],
  },
];

export function findTherapist(slug: string): Therapist | undefined {
  return therapists.find((therapist) => therapist.slug === slug);
}

export function otherTherapists(slug: string): Therapist[] {
  return therapists.filter((therapist) => therapist.slug !== slug);
}
