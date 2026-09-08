/**
 * Everything this tenant's landing page says, in one place.
 *
 * # Why a `.ts` module and not `src/messages/`
 *
 * `src/messages/` is the *platform's* catalogue — chrome the platform owns and
 * translates. This is **tenant-authored copy**, and D-077 is explicit that the
 * platform never translates what a tenant writes. Sanja's words belong to
 * Sanja; they are content, not UI strings.
 *
 * Keeping them here also satisfies the I18N-5 ratchet from the architecture
 * check, which refuses inline Serbian in `.tsx`. The components below import
 * from this module and stay free of copy — which is what makes them reusable
 * when PDC-1 turns this into an editable page model.
 *
 * Source: `documentations/design/Sanja Neuer landing stranica-handoff`.
 * Copy is verbatim from the approved v2 prototype; the handoff marks it final.
 */

export const sanjaNav = [
  { id: "o-meni", label: "O meni" },
  { id: "metod", label: "Metod" },
  { id: "usluge", label: "Usluge" },
  { id: "blog", label: "Video blog" },
  { id: "kontakt", label: "Kontakt" },
] as const;

export const sanjaContent = {
  wordmark: "Sanja Neuer",
  nav: {
    book: "Zakaži",
    login: "Login",
    menu: "Meni",
    closeMenu: "Zatvori meni",
  },

  hero: {
    eyebrow: "Psiholog · Psihoterapeut · Konsultant",
    title:
      "Stvorite život koji želite — i postanite osoba kakva želite da budete.",
    lead: "Konsultacije i mentorstvo koji spajaju psihoterapiju, porodične konstelacije i neuroplastično kreiranje budućnosti. Radimo na transgeneracijskim uzrocima i na blokadama koje vam ne dozvoljavaju da zamislite svoju budućnost.",
    primaryCta: "Zakaži konsultaciju",
    secondaryCta: "Upoznaj metod",
    micro: "Online, 60 minuta · Odgovor na prijavu u roku od 24 sata",
    portraitAlt: "Sanja Neuer, portret",
  },

  stats: [
    { value: "20+", label: "godina prakse" },
    { value: "TEDx", label: "govornica" },
    { value: "3", label: "metodologije u jednom procesu" },
    { value: "∞", label: "nacionalni kongresi psihoterapeuta" },
  ],

  bio: {
    eyebrow: "Ko sam ja",
    quote: "„Sama psihoterapija nekada nije dovoljna.”",
    title:
      "Psiholog koja radi na uzrocima — transgeneracijskim, telesnim i onim u vašoj slici budućnosti.",
    paragraphs: [
      "Po osnovnom zanimanju psiholog, sa dodatnim edukacijama iz psihoterapije, treninga, obuke, porodičnih konstelacija i duhovnosti.",
      "Kao psihoterapeut i trener radim 20 godina. U tom vremenu pokrenula sam nekoliko projekata, uvodila inovacije i nove teorijske koncepte u svoj rad. Govorila sam na TEDx konferenciji i više puta na nacionalnim kongresima psihoterapeuta.",
      "Shvatila sam da je potrebno istražiti i transgeneracijske uzroke, kao i blokade koje onemogućavaju osobi da zamisli i ostvari budućnost. Zato je fokus mog rada danas na konsultacijama koje pružaju sveobuhvatan pristup.",
    ],
    chips: [
      "Psihoterapija",
      "Porodične konstelacije",
      "Trening i obuka",
      "Duhovnost",
      "Neuroplastičnost",
    ],
    cta: "Zakaži konsultaciju sa mnom →",
    portraitAlt: "Sanja Neuer u radnom prostoru",
  },

  frameworks: {
    eyebrow: "Teorijski okviri",
    title: "Tri okvira iz kojih gledam vašu situaciju",
    lead: "Nisu tehnike — to su tri pretpostavke o tome kako se čovek menja. One određuju kako vodim ceo proces.",
    cards: [
      {
        index: "01",
        title: "Ljubav prema sebi",
        body: "Ne kao afirmacija, nego kao odnos. Dok se prema sebi odnosite kao prema nekome koga treba ispravljati, svaka promena traje samo dok traje disciplina.",
        fill: "surface",
      },
      {
        index: "02",
        title: "Identity Invention",
        body: "Identitet nije samo nasleđeni zbir uloga i porodičnih očekivanja. Može se osmisliti — svesno, sa jasnim kriterijumom kakva osoba želite da postanete.",
        fill: "burgundy",
      },
      {
        index: "03",
        title: "Kreiranje ex nihilo",
        body: "Budućnost se ne mora izvlačiti iz prošlosti. Ono što nikada nije postojalo u vašoj porodičnoj priči takođe je moguće — i može se konkretno isplanirati.",
        fill: "ink",
      },
    ],
  },

  methodology: {
    eyebrow: "Metodologija",
    title: "Sinteza tri metode u jednom procesu",
    lead: "Ne birate metod — ja ga birem u svakom trenutku procesa, prema tome šta je uzrok, a šta simptom. Prošlost, telo i budućnost tretiraju se kao jedan sistem.",
    textureAlt: "Tekstura u bojama brenda",
    steps: [
      {
        numeral: "I",
        title: "Porodične konstelacije",
        body: "Otkrivamo transgeneracijske uzroke: lojalnosti, isključene članove, nedovršene priče koje se ponavljaju kroz vaše odluke. Ono što se ne vidi, ponavlja se.",
      },
      {
        numeral: "II",
        title: "Psihoterapijska metoda",
        body: "Dvadeset godina kliničkog rada: rad sa unutrašnjim blokadama, obrascima vezivanja i emocijama koje su ostale bez svog konteksta.",
      },
      {
        numeral: "III",
        title: "Neuroplastično kreiranje budućnosti",
        body: "Kada uzrok popusti, gradimo novo: konkretnu sliku budućnosti i ponašanja koja je čine mogućom, dovoljno dosledno da mozak nauči novu mapu.",
      },
    ],
    primaryCta: "Zakaži konsultaciju",
    secondaryCta: "Vidi usluge i cene",
  },

  services: {
    eyebrow: "Usluge",
    title: "Dva načina da radimo zajedno",
    lead: "Sve se odvija online. Ako niste sigurni šta vam treba, prijavite se za uvodni razgovor — zajedno ćemo odrediti.",
    cards: [
      {
        title: "Konsultacija 1:1",
        badge: "Najčešće",
        body: "Pojedinačna sesija od 60 minuta. Radimo na konkretnoj temi: odnos, odluka, blokada, ponavljajući obrazac ili prelaz u novu fazu života.",
        bullets: [
          "Mapiranje uzroka, ne samo simptoma",
          "Konstelacijski rad po potrebi",
          "Pisani rezime i koraci nakon sesije",
        ],
        cta: "Zakaži termin",
        fill: "burgundy",
      },
      {
        title: "Mentorstvo",
        badge: "3 meseca",
        body: "Vođen proces za one koji prave veliki prelaz: identitet, poziv, partnerstvo ili izlazak iz porodičnog scenarija. Šest sesija i rad između njih.",
        bullets: [
          "Individualni plan sa jasnim kriterijumom uspeha",
          "Rad na sve tri metodologije redom",
          "Podrška između sesija",
        ],
        cta: "Zakaži uvodni razgovor",
        fill: "surface",
      },
    ],
  },

  process: {
    eyebrow: "Kako počinjemo",
    title: "Četiri koraka od prijave do promene",
    steps: [
      {
        index: "01",
        title: "Prijava",
        body: "Kratak formular — dva minuta. Napišete temu i kada vam odgovara.",
      },
      {
        index: "02",
        title: "Uvodni razgovor",
        body: "20 minuta, bez naknade. Proveravamo da li je ovaj pristup ono što vam treba.",
      },
      {
        index: "03",
        title: "Plan rada",
        body: "Dobijate okvir: šta radimo, kojim metodom i kako znamo da se pomerilo.",
      },
      {
        index: "04",
        title: "Proces i integracija",
        body: "Radimo, pa učvršćujemo — da promena ostane i kada seansi više nema.",
      },
    ],
  },

  blog: {
    eyebrow: "Video blog",
    title: "Stručni sadržaj — bez skraćivanja",
    channelCta: "Ceo YouTube kanal",
    chaptersLabel: "Poglavlja",
    episodesLabel: "Sve epizode",
    ctaStripText:
      "Tema vam je poznata iz sopstvenog života? To je najbolji trenutak za konsultaciju.",
    ctaStripButton: "Zakaži",
    playLabel: "Pusti video",
  },

  faq: {
    eyebrow: "Pitanja",
    title: "Ono što se najčešće pita pre prve sesije",
    lead: "Ako vam pitanje nije tu, napišite ga u prijavi — odgovaram lično.",
    cta: "Postavi pitanje u prijavi",
  },

  ctaBand: {
    eyebrow: "Prvi korak",
    title: "Zakažite konsultaciju i počnimo od uzroka.",
    lead: "Prijava traje dva minuta. Javljam se u roku od 24 sata sa predlogom termina.",
    cta: "Zakaži konsultaciju",
  },

  footer: {
    tagline:
      "Konsultacije i mentorstvo — sinteza psihoterapije, porodičnih konstelacija i neuroplastične transformacije.",
    pagesLabel: "Stranice",
    topicsLabel: "Teme",
    topics: [
      "Porodične konstelacije",
      "Identity Invention",
      "Neuroplastičnost",
      "Ljubav prema sebi",
    ],
    bookingLabel: "Zakazivanje",
    bookingCta: "Zakaži konsultaciju",
    availability: "Online · Odgovor u 24h",
    rights: "© 2026 Sanja Neuer. Sva prava zadržana.",
    platformPrefix: "Deo ",
    platformName: "P. Digital Centar",
    platformSuffix: " platforme",
  },

  stickyBar: {
    text: "Konsultacija 1:1 · online, 60 min",
    cta: "Zakaži",
  },

  booking: {
    eyebrow: "Prijava za konsultaciju",
    title: "Zakažite termin",
    lead: "Dva minuta. Javljam se u roku od 24 sata sa predlogom termina.",
    close: "Zatvori",
    fields: {
      name: { label: "Ime i prezime", placeholder: "Vaše ime" },
      email: { label: "Email", placeholder: "vas@email.com" },
      phone: { label: "Telefon (opciono)", placeholder: "+381" },
      service: {
        label: "Usluga",
        options: [
          "Konsultacija 1:1 (60 min)",
          "Mentorstvo (3 meseca)",
          "Nisam sigurna — predloži",
        ],
      },
      slot: {
        label: "Kada vam odgovara",
        options: ["Jutro (09—12h)", "Popodne (12—17h)", "Veče (17—21h)"],
      },
      language: {
        label: "Jezik sesije",
        options: ["Srpski", "English", "Deutsch"],
      },
      topic: {
        label: "Sa čim želite da radimo",
        placeholder: "Kratko o temi — dovoljno je nekoliko rečenica.",
      },
      consent:
        "Saglasna/saglasan sam da moji podaci budu korišćeni isključivo radi dogovora o terminu.",
    },
    freeNote: "Bez naplate do potvrđenog termina.",
    submit: "Pošalji prijavu",
    submitting: "Šaljem…",
    errorTitle: "Prijava nije poslata.",
    errorBody:
      "Došlo je do greške pri slanju. Pokušajte ponovo za trenutak ili pišite direktno.",
    successTitle: "Prijava je poslata.",
    successBody:
      "Hvala vam. Odgovaram lično, u roku od 24 sata, sa dva predloga termina.",
    successClose: "Zatvori",
  },
} as const;

export const sanjaSeo = {
  title:
    "Sanja Neuer — Konsultacije i mentorstvo | Psihoterapija, porodične konstelacije i neuroplastična transformacija",
  description:
    "Sanja Neuer — psiholog i psihoterapeut sa 20 godina prakse. Konsultacije i mentorstvo koji spajaju psihoterapiju, porodične konstelacije i neuroplastično kreiranje budućnosti. Zakažite online konsultaciju.",
  keywords: [
    "Sanja Neuer",
    "psiholog",
    "psihoterapija",
    "porodične konstelacije",
    "konsultacije",
    "mentorstvo",
    "neuroplastičnost",
    "online konsultacija",
  ],
  ogTitle: "Sanja Neuer — Konsultacije i mentorstvo",
  ogDescription:
    "Sveobuhvatni pristup: psihoterapija, porodične konstelacije i neuroplastično kreiranje budućnosti. Zakažite konsultaciju online.",
} as const;
