import { TherapistRow } from "psihointegritet-ds";

// Real content from src/content/therapists.ts (same objects as
// TherapistCard.tsx's preview, draft status per that file's governance
// note). `image` is intentionally left empty: unlike TherapistCard (which
// goes through MonogramAvatar and falls back to initials), TherapistRow
// always renders a bare <Image fill> with no fallback, and this sync's
// static server only serves ds-bundle/, not frontend/public/ — pointing it
// at the real "/images/therapists/*.jpeg" paths would just 404 into a
// broken-image glyph. An empty src renders as an empty rounded portrait
// frame (bg-meadow/30 shows through), which is the accurate "no confirmed
// portrait yet" state, not a preview shortcut.

const maria = {
  slug: "maria-bullock",
  name: "Maria Bullock",
  nameAccusative: "Mariju",
  firstName: "Maria",
  firstNameInstrumental: "Elsom",
  initials: "MB",
  title:
    "Osnivačica Psihointegriteta · Socijalni radnik i sertifikovana geštalt psihoterapeutkinja",
  badge: "Osnivačica",
  quote:
    "Moj pristup se oslanja na geštalt psihoterapiju, koja podstiče razvoj svesnosti, autentičnosti i preuzimanje odgovornosti za sopstveni život.",
  formats: "Individualni rad · Rad sa parovima · Online i uživo",
  city: "Niš",
  cityLocative: "Nišu",
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
  image: "",
  cardExcerpt:
    "Kroz individualni rad i rad sa parovima pružam podršku ljudima koji žele bolje da razumeju sebe, unaprede kvalitet svojih odnosa i pronađu zdravije načine suočavanja.",
  bio: [],
};

const elsa = {
  slug: "elsa-browers",
  name: "Elsa Browers",
  nameAccusative: "Mariju",
  firstName: "Elsa",
  firstNameInstrumental: "Elsom",
  initials: "EB",
  title: "Pedagog i sertifikovana geštalt psihoterapeutkinja",
  badge: "Adolescenti i odrasli",
  quote:
    "Podržavam adolescente i odrasle u ličnom razvoju, emocionalnim teškoćama i unapređenju odnosa sa drugima.",
  formats: "Individualni rad · Adolescenti i odrasli · Online i uživo",
  city: "Leskovac",
  cityLocative: "Leskovcu",
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
  bookingServiceSlugs: ["individualna-psihoterapija", "roditeljsko-savetovanje"],
  image: "",
  cardExcerpt:
    "Radim sa adolescentima i odraslima kroz individualni psihoterapijski rad, pružajući podršku u ličnom razvoju, emocionalnim teškoćama i unapređenju međuljudskih odnosa.",
  bio: [],
};

export function FounderRow() {
  return <TherapistRow therapist={maria} flipped={false} priority />;
}

export function TeamMemberRowFlipped() {
  return <TherapistRow therapist={elsa} flipped />;
}
