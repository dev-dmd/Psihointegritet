/**
 * The video library behind `#blog`.
 *
 * Static today, and deliberately shaped like what will replace it: the platform
 * already has editors for title, description, tags and chapters, so when this
 * tenant's content moves into the CMS the page renders the same shape from a
 * different source. Nothing in the components knows where these came from.
 *
 * `youtubeId` is absent on purpose rather than faked. The handoff calls for a
 * `youtube-nocookie` embed with chapter seeking once real ids exist; until then
 * the player renders its own frame and the chapter rows are not links to
 * nowhere.
 */

export interface SanjaChapter {
  /** Timestamp as shown, e.g. `4:35`. Also the seek offset once embedded. */
  at: string;
  label: string;
}

export interface SanjaVideo {
  id: string;
  title: string;
  meta: string;
  duration: string;
  short: string;
  lead: string;
  body: string;
  tags: readonly string[];
  chapters: readonly SanjaChapter[];
}

export const sanjaVideos: readonly SanjaVideo[] = [
  {
    id: "v1",
    title: "Zašto psihoterapija nekada nije dovoljna",
    meta: "12.400 pregleda · pre 3 nedelje",
    duration: "24:18",
    short: "Kada rad na sebi ide u krug — i šta se tada zapravo dešava.",
    lead: "Ima trenutaka kada klijent uradi sve ispravno — dolazi, razume, radi — a život se ne pomera. U ovoj epizodi objašnjavam zašto se to dešava i gde tražim uzrok kada ga u individualnoj priči nema.",
    body: "Govorim o tri sloja koja proveravam: obrazac koji se ponavlja u generacijama, telesnu naviku koja drži staro stanje i odsustvo slike budućnosti. Kada bilo koji od njih ostane nedirnut, uvid ostaje uvid — ne postaje promena. Na kraju dajem konkretan način da prepoznate koji sloj je vaš.",
    tags: ["psihoterapija", "uzroci", "obrasci", "promena"],
    chapters: [
      { at: "0:00", label: "Zašto uvid nije dovoljan" },
      { at: "4:35", label: "Simptom kao lojalnost sistemu" },
      { at: "11:02", label: "Telo koje čuva staro stanje" },
      { at: "17:40", label: "Kada nema slike budućnosti" },
      { at: "21:15", label: "Kako prepoznati svoj sloj" },
    ],
  },
  {
    id: "v2",
    title: "Porodične konstelacije: nasleđe koje ne vidimo",
    meta: "8.900 pregleda · pre 2 meseca",
    duration: "31:05",
    short:
      "Transgeneracijski uzroci i zašto se tuđa priča ponavlja kroz vaše odluke.",
    lead: "Šta su porodične konstelacije kada se skinu mistifikacija i patos. Kroz primere pokazujem kako isključeni članovi, rane smrti i nedovršena žalost postaju vaš današnji izbor partnera, posla i granica.",
    body: "Objašnjavam pojam lojalnosti sistemu, razliku između krivice i pripadanja, i kako izgleda konstelacijski rad u okviru konsultacije jedan na jedan — bez grupe, bez postavljanja predstavnika.",
    tags: [
      "porodicne-konstelacije",
      "transgeneracijsko",
      "lojalnost",
      "sistem",
    ],
    chapters: [
      { at: "0:00", label: "Šta konstelacije jesu, a šta nisu" },
      { at: "6:20", label: "Isključeni članovi i njihova mesta" },
      { at: "14:10", label: "Lojalnost kao nevidljivi ugovor" },
      { at: "22:30", label: "Konstelacija u radu jedan na jedan" },
      { at: "28:00", label: "Šta se menja posle" },
    ],
  },
  {
    id: "v3",
    title: "Identity Invention: kako se identitet osmišljava",
    meta: "6.150 pregleda · pre 4 meseca",
    duration: "19:47",
    short: "Identitet kao odluka, a ne kao zbir uloga koje ste dobili.",
    lead: "Većina nas nosi identitet koji je sastavljen od tuđih očekivanja. Ovaj koncept uvodim u svoj rad kao odgovor na pitanje: kakva osoba treba da budem da bi život koji želim uopšte bio moguć.",
    body: "Prolazimo kroz razliku između popravljanja sebe i osmišljavanja sebe, kroz kriterijum po kojem se novi identitet proverava, i kroz prve nedelje u kojima je najlakše odustati.",
    tags: ["identity-invention", "identitet", "ljubav-prema-sebi", "odluka"],
    chapters: [
      { at: "0:00", label: "Nasleđeni identitet" },
      { at: "5:12", label: "Popravljanje vs. osmišljavanje" },
      { at: "10:30", label: "Kriterijum novog identiteta" },
      { at: "15:05", label: "Prve tri nedelje" },
    ],
  },
  {
    id: "v4",
    title: "Neuroplastično kreiranje budućnosti",
    meta: "5.480 pregleda · pre 5 meseci",
    duration: "27:32",
    short:
      "Kreiranje ex nihilo: kako mozak uči budućnost koja nikada nije postojala.",
    lead: "Ako se budućnost izvlači samo iz prošlosti, ona je u najboljem slučaju bolja verzija istog. Ovde govorim o kreiranju ex nihilo — i o tome šta neuroplastičnost realno omogućava, a šta ne.",
    body: "Praktičan deo: kako se pravi slika budućnosti dovoljno konkretna da bude upotrebljiva, koja ponašanja je čine mogućom i koliko dosledno moraju da se ponavljaju da bi mozak uspostavio novu mapu.",
    tags: ["neuroplasticnost", "ex-nihilo", "buducnost", "praksa"],
    chapters: [
      { at: "0:00", label: "Granice pozitivnog mišljenja" },
      { at: "7:45", label: "Šta neuroplastičnost jeste" },
      { at: "13:20", label: "Slika budućnosti koja se može koristiti" },
      { at: "19:00", label: "Doslednost umesto motivacije" },
      { at: "24:10", label: "Kako meriti pomeraj" },
    ],
  },
];

export interface SanjaFaqItem {
  id: string;
  question: string;
  answer: string;
}

export const sanjaFaq: readonly SanjaFaqItem[] = [
  {
    id: "q1",
    question: "Koja je razlika između konsultacije i psihoterapije?",
    answer:
      "Psihoterapija je proces koji se odvija u dužem vremenu i primarno radi na simptomu i njegovom razumevanju. Konsultacija kod mene je sveobuhvatniji i usmereniji rad: uzroci, uključujući transgeneracijske, i konkretno kreiranje budućnosti koju želite.",
  },
  {
    id: "q2",
    question: "Da li mogu da dođem sa jednom konkretnom temom?",
    answer:
      "Da, i to je najčešći način rada. Jedna sesija od 60 minuta može da razjasni uzrok i da vam ostavi jasne korake, bez obaveze da nastavite u dugom procesu.",
  },
  {
    id: "q3",
    question: "Kako izgleda konstelacijski rad ako nema grupe?",
    answer:
      "U individualnom radu koristimo unutrašnje predstavnike i vođen proces — bez postavljanja ljudi u prostoru. Efekat prepoznavanja i razrešenja je isti, a rad je diskretniji.",
  },
  {
    id: "q4",
    question: "Da li se sesije održavaju online?",
    answer:
      "Da, sve sesije su online i time dostupne bez obzira na to gde se nalazite. Sesije se održavaju na srpskom, engleskom ili nemačkom jeziku.",
  },
  {
    id: "q5",
    question: "Šta se dešava nakon prijave?",
    answer:
      "Odgovaram lično u roku od 24 sata, sa dva predloga termina. Pre prve pune sesije možemo imati uvodni razgovor od 20 minuta bez naknade, da proverimo da li je ovaj pristup ono što vam treba.",
  },
];
