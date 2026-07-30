import { TherapistCard } from "psihointegritet-ds";

// Real content from src/content/therapists.ts (draft status, per that
// file's governance note — titles/prices are deliberately generic pending
// each therapist's written confirmation). imageSrc is intentionally omitted:
// MonogramAvatar's own JSDoc notes photos are "placeholder until real
// portraits are approved", so the initials-only state IS the current
// production state, not a preview shortcut.
const anja = {
  slug: "anja-stamenkovic",
  name: "Anja Stamenković",
  nameAccusative: "Anju",
  firstName: "Anja",
  firstNameInstrumental: "Anjom",
  initials: "AS",
  title: "Osnivačica Psihointegriteta · Socijalni radnik i geštalt psihoterapeutkinja",
  badge: "Osnivačica",
  quote:
    "Vjerujem da svaka osoba nosi kapacitet za promjenu, ali da se ona događa tek kada se osjetimo dovoljno sigurno da budemo autentični.",
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
    "Kao geštalt psihoterapeut posvećena sam stvaranju prostora u kojem ljudi mogu da zastanu, bolje razumiju sebe i pronađu način da žive u većem skladu sa sobom i drugima.",
  bio: [],
};

const marija = {
  slug: "marija-stamenkovic",
  name: "Marija Stamenković",
  nameAccusative: "Mariju",
  firstName: "Marija",
  firstNameInstrumental: "Marijom",
  initials: "MS",
  title: "Pedagog i geštalt psihoterapeutkinja",
  badge: "Adolescenti i odrasli",
  quote:
    "Verujem da svaka osoba u sebi nosi kapacitet za promenu i rast, a da je uloga terapeuta da stvori siguran odnos u kojem taj potencijal može da se razvije.",
  formats: "Individualni rad · Adolescenti i odrasli · Online i uživo",
  city: "Leskovac",
  cityLocative: "Leskovcu",
  areas: ["Adolescenti", "Samopouzdanje", "Emocionalne teškoće", "Odnosi", "Razvoj identiteta", "Rad na emocijama"],
  additionalServices: [{ title: "Savetovanje adolescenata", duration: null, price: null }],
  bookingServiceSlugs: ["individualna-psihoterapija", "roditeljsko-savetovanje"],
  image: "",
  cardExcerpt:
    "Više od 26 godina radim kao stručni saradnik u obrazovanju, pružajući podršku deci, adolescentima, roditeljima i nastavnicima u različitim razvojnim i životnim izazovima.",
  bio: [],
};

export function Founder() {
  return <TherapistCard therapist={anja} />;
}

export function TeamMember() {
  return <TherapistCard therapist={marija} />;
}
