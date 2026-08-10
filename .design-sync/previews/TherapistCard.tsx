import { TherapistCard } from "psihointegritet-ds";

// Real content from src/content/therapists.ts (draft status, per that
// file's governance note — titles/prices are deliberately generic pending
// each therapist's written confirmation). imageSrc is intentionally omitted:
// MonogramAvatar's own JSDoc notes photos are "placeholder until real
// portraits are approved", so the initials-only state IS the current
// production state, not a preview shortcut.
const maria = {
  slug: "maria-bullock",
  name: "Maria Bullock",
  nameAccusative: "Mariju",
  firstName: "Maria",
  firstNameInstrumental: "Elsom",
  initials: "MB",
  title: "Osnivačica Psihointegriteta · Socijalni radnik i sertifikovana geštalt psihoterapeutkinja",
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
  bookingServiceSlugs: ["individualna-psihoterapija", "bracno-savetovanje", "roditeljsko-savetovanje"],
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
  areas: ["Adolescenti", "Samopouzdanje", "Emocionalne teškoće", "Odnosi", "Razvoj identiteta", "Rad na emocijama"],
  additionalServices: [{ title: "Savetovanje adolescenata", duration: null, price: null }],
  bookingServiceSlugs: ["individualna-psihoterapija", "roditeljsko-savetovanje"],
  image: "",
  cardExcerpt:
    "Radim sa adolescentima i odraslima kroz individualni psihoterapijski rad, pružajući podršku u ličnom razvoju, emocionalnim teškoćama i unapređenju međuljudskih odnosa.",
  bio: [],
};

export function Founder() {
  return <TherapistCard therapist={maria} />;
}

export function TeamMember() {
  return <TherapistCard therapist={elsa} />;
}
