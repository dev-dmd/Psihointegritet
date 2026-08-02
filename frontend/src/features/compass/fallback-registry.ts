/**
 * Kompas fallback registry — demo data for the public surfaces.
 *
 * Same contract as the rest of the site's fallback layer (D-038): checked-in
 * copy renders until the real, published source exists, and is then overridden
 * field by field. `static-provider.ts` does exactly this for pages; this module
 * does it for the Kompas registry, which today holds **zero** published areas
 * or topics.
 *
 * Two rules this file must never break:
 *
 * 1. **Display only.** `KOMPAS_TODO.md` §0 forbids hardcoding expert categories,
 *    synonyms or recommendation rules in React components. These values exist so
 *    the mechanics and flow can be reviewed before Anja's table arrives — they
 *    are never a recommendation authority, and nothing here is persisted.
 * 2. **The published registry always wins.** `compass-provider.ts` prefers the
 *    public API and falls back here only when it returns nothing.
 *
 * In demo rows `stableId` and `slug` are intentionally the same string. In real
 * data they are separate identities: the stable ID never changes, the slug is a
 * locale-aware route that can be corrected (leaving a 308 alias).
 */

/** Only the levels D-048/ADR-018 can evaluate today. */
export type CompassAccessLevel = "public" | "registered";

export interface CompassTopic {
  stableId: string;
  slug: string;
  label: string;
  description: string;
  areaStableId: string;
}

export interface CompassArea {
  stableId: string;
  slug: string;
  label: string;
  description: string;
  topics: readonly CompassTopic[];
}

export interface CompassOption {
  id: string;
  label: string;
  note?: string;
}

/**
 * A content card as the preview surfaces render it. No score, no ranking field
 * and no therapist reference by construction — ranking is the backend's
 * `compass_rules.py` with its own `ruleVersion`.
 */
export interface CompassContentCard {
  id: string;
  kind: string;
  title: string;
  description: string;
  duration: string;
  areaStableId: string;
  topicStableIds: readonly string[];
  goalIds: readonly string[];
  accessLevel: CompassAccessLevel;
  /** Declared, non-semantic ordering. Not relevance. */
  order: number;
}

export interface CompassRegistry {
  areas: readonly CompassArea[];
  audiences: readonly CompassOption[];
  goals: readonly CompassOption[];
  journeys: readonly CompassOption[];
  content: readonly CompassContentCard[];
}

export function allFallbackTopics(
  registry: CompassRegistry,
): readonly CompassTopic[] {
  return registry.areas.flatMap((item) => [...item.topics]);
}

interface TopicSeed {
  slug: string;
  label: string;
  description: string;
}

function area(
  slug: string,
  label: string,
  description: string,
  topics: readonly TopicSeed[],
): CompassArea {
  return {
    stableId: slug,
    slug,
    label,
    description,
    topics: topics.map((topic): CompassTopic => ({
      stableId: topic.slug,
      slug: topic.slug,
      label: topic.label,
      description: topic.description,
      areaStableId: slug,
    })),
  };
}

const fallbackAreas: readonly CompassArea[] = [
  area(
    "anksioznost",
    "Anksioznost",
    "Napetost, briga i strah koji se vraćaju.",
    [
      {
        slug: "napadi-panike",
        label: "Napadi panike",
        description:
          "Iznenadni talasi straha sa jakim telesnim reakcijama, često bez jasnog povoda.",
      },
      {
        slug: "socijalna-anksioznost",
        label: "Socijalna anksioznost",
        description:
          "Napetost pred drugima, strah od procene i izbegavanje situacija.",
      },
      {
        slug: "stalna-zabrinutost",
        label: "Stalna zabrinutost",
        description:
          "Misli koje se vrte u krug i telo koje se retko potpuno opusti.",
      },
    ],
  ),
  area(
    "stres-i-burnout",
    "Stres i burnout",
    "Kada iscrpljenost postane svakodnevica.",
    [
      {
        slug: "hronicni-stres",
        label: "Hronični stres",
        description:
          "Pritisak koji traje dovoljno dugo da postane svakodnevica.",
      },
      {
        slug: "burnout-na-radu",
        label: "Burnout na radu",
        description:
          "Iscrpljenost, distanca prema poslu i osećaj da ništa nije dovoljno.",
      },
      {
        slug: "napetost-u-telu",
        label: "Napetost u telu",
        description: "Telo koje ostaje napeto i kada za to više nema povoda.",
      },
    ],
  ),
  area(
    "depresivnost-i-energija",
    "Depresivnost i gubitak energije",
    "Kada se volja i energija dugo ne vraćaju.",
    [
      {
        slug: "bez-energije",
        label: "Bez energije",
        description: "Umor koji ne prolazi ni posle odmora.",
      },
      {
        slug: "izgubljena-motivacija",
        label: "Izgubljena motivacija",
        description: "Kada ni ono što je nekada prijalo više ne pokreće.",
      },
    ],
  ),
  area(
    "emocionalna-regulacija",
    "Emocionalna regulacija",
    "Intenzivne emocije i način na koji ih nosimo.",
    [
      {
        slug: "intenzivne-emocije",
        label: "Intenzivne emocije",
        description:
          "Osećanja koja dođu brzo i jako, pre nego što stignete da ih imenujete.",
      },
      {
        slug: "ljutnja",
        label: "Ljutnja",
        description: "Ljutnja koja iznenadi svojom snagom ili se dugo skuplja.",
      },
      {
        slug: "samosaosecanje",
        label: "Samosaosećanje",
        description: "Odnos prema sebi u trenucima kada je najteže.",
      },
    ],
  ),
  area(
    "samopouzdanje-i-granice",
    "Samopouzdanje i granice",
    "Jasnije zauzimanje za sebe, bez osećaja krivice.",
    [
      {
        slug: "postavljanje-granica",
        label: "Postavljanje granica",
        description:
          "Kako reći ne, a ostati u dobrom odnosu sa sobom i drugima.",
      },
      {
        slug: "osecaj-krivice",
        label: "Osećaj krivice",
        description: "Krivica koja se javlja čim stavite sebe na listu.",
      },
      {
        slug: "samopostovanje",
        label: "Samopoštovanje",
        description: "Vrednost koju sebi priznajete i kada niko ne gleda.",
      },
    ],
  ),
  area(
    "partnerski-odnosi",
    "Partnerski odnosi",
    "Komunikacija, bliskost i faze kroz koje odnos prolazi.",
    [
      {
        slug: "komunikacija-u-vezi",
        label: "Komunikacija u vezi",
        description: "Razgovori koji se ponavljaju, a ne pomeraju sa mesta.",
      },
      {
        slug: "konflikti",
        label: "Ponavljajući konflikti",
        description: "Isti sukob u novom povodu, po deseti put.",
      },
      {
        slug: "bliskost-i-poverenje",
        label: "Bliskost i poverenje",
        description:
          "Blizina koja se izgubila i poverenje koje se gradi ponovo.",
      },
    ],
  ),
  area(
    "roditeljstvo",
    "Roditeljstvo",
    "Podrška u izazovima roditeljske uloge.",
    [
      {
        slug: "roditeljski-stres",
        label: "Roditeljski stres",
        description:
          "Kada roditeljska uloga traži više nego što trenutno imate.",
      },
      {
        slug: "granice-sa-decom",
        label: "Granice sa decom",
        description: "Dogovori koji drže, bez podizanja glasa.",
      },
      {
        slug: "podrska-adolescentu",
        label: "Podrška adolescentu",
        description: "Blizina sa tinejdžerom koji traži svoj prostor.",
      },
    ],
  ),
  area(
    "tugovanje-i-gubitak",
    "Tugovanje i gubitak",
    "Gubitak, rastanak i teški životni periodi.",
    [
      {
        slug: "gubitak-bliznjeg",
        label: "Gubitak bližnjeg",
        description: "Tugovanje koje nema raspored ni pravila.",
      },
      {
        slug: "razvod-i-rastanak",
        label: "Razvod i rastanak",
        description: "Kraj odnosa i život koji se posle njega ponovo sklapa.",
      },
    ],
  ),
  area("trauma", "Trauma", "Kako teška iskustva ostaju u telu i odnosima.", [
    {
      slug: "reakcije-posle-dogadjaja",
      label: "Reakcije posle događaja",
      description: "Ono što se javlja danima i mesecima posle teškog iskustva.",
    },
    {
      slug: "trauma-i-telo",
      label: "Trauma i telo",
      description: "Telesni odgovori koji ostaju i kada je opasnost prošla.",
    },
  ]),
  area(
    "poslovno-mentalno-zdravlje",
    "Poslovno mentalno zdravlje",
    "Mentalno zdravlje zaposlenih i odnosi na radu.",
    [
      {
        slug: "odnosi-na-radu",
        label: "Odnosi na radu",
        description: "Saradnja, granice i pritisak unutar tima.",
      },
      {
        slug: "ravnoteza-rada-i-zivota",
        label: "Ravnoteža rada i života",
        description: "Granica između posla i svega ostalog.",
      },
    ],
  ),
];

const fallbackAudiences: readonly CompassOption[] = [
  { id: "odrasli", label: "Za sebe" },
  { id: "roditelji", label: "Kao roditelj, za odnos sa detetom" },
  { id: "adolescenti", label: "Za dete ili adolescenta" },
  { id: "partneri", label: "Za partnerski odnos" },
  { id: "zaposleni", label: "Za tim ili zaposlene" },
];

const fallbackGoals: readonly CompassOption[] = [
  { id: "razumevanje", label: "Bolje razumevanje sebe i situacije" },
  { id: "alati", label: "Praktični alati i tehnike" },
  { id: "iskustva", label: "Iskustva drugih ljudi" },
  { id: "program", label: "Radionica ili program" },
  { id: "strucna", label: "Razgovor sa stručnom osobom" },
];

/** Locked system axis (D-053) — the three values are a closed contract. */
const fallbackJourneys: readonly CompassOption[] = [
  {
    id: "explore",
    label: "Želim sam da istražujem",
    note: "Sadržaji, vežbe i vodiči — bez kontakta.",
  },
  {
    id: "professional_support",
    label: "Želim stručnu podršku",
    note: "Vodimo vas na Pronađi podršku, uz vašu potvrdu.",
  },
  {
    id: "both",
    label: "I jedno i drugo",
    note: "Prvo sadržaji, pa stručna podrška kada budete želeli.",
  },
];

function card(
  id: string,
  kind: string,
  title: string,
  description: string,
  duration: string,
  areaStableId: string,
  topicStableIds: readonly string[],
  goalIds: readonly string[],
  accessLevel: CompassContentCard["accessLevel"],
  order: number,
): CompassContentCard {
  return {
    id,
    kind,
    title,
    description,
    duration,
    areaStableId,
    topicStableIds,
    goalIds,
    accessLevel,
    order,
  };
}

const fallbackContent: readonly CompassContentCard[] = [
  card(
    "a1",
    "Vodič",
    "Šta se dešava u telu kada smo pod stresom",
    "Jednostavno objašnjenje zašto telo reaguje i kada ta reakcija postane hronična.",
    "7 min čitanja",
    "stres-i-burnout",
    ["hronicni-stres", "napetost-u-telu"],
    ["razumevanje"],
    "public",
    1,
  ),
  card(
    "a2",
    "Audio vežba",
    "Vođena vežba za smirivanje napetosti",
    "Kratka vežba disanja koju možete uraditi bilo gde, uz slušalice.",
    "12 min",
    "anksioznost",
    ["stalna-zabrinutost", "napadi-panike"],
    ["alati"],
    "public",
    2,
  ),
  card(
    "a3",
    "Radni list",
    "Dnevnik napetosti — sedam dana",
    "Beležite šta se dešava pre i posle napetosti, da uočite obrazac.",
    "PDF · 4 strane",
    "anksioznost",
    ["stalna-zabrinutost"],
    ["alati", "razumevanje"],
    "public",
    3,
  ),
  card(
    "a4",
    "Vodič",
    "Kada strah dođe iznenada",
    "Šta se dešava tokom napada panike i šta pomaže u prvim minutima.",
    "9 min čitanja",
    "anksioznost",
    ["napadi-panike"],
    ["razumevanje", "alati"],
    "public",
    4,
  ),
  card(
    "a5",
    "Video",
    "Zašto izbegavanje pojačava strah",
    "Kratko objašnjenje kruga izbegavanja i kako se iz njega izlazi.",
    "11 min",
    "anksioznost",
    ["socijalna-anksioznost", "napadi-panike"],
    ["razumevanje"],
    "registered",
    5,
  ),
  card(
    "a6",
    "Radionica",
    "Kako izaći iz kruga brige",
    "Interaktivna radionica uživo ili online — prepoznavanje okidača i rad na njima.",
    "3 sata",
    "anksioznost",
    ["stalna-zabrinutost", "socijalna-anksioznost"],
    ["program", "alati"],
    "public",
    6,
  ),
  card(
    "b1",
    "Vodič",
    "Burnout nije lenjost",
    "Kako prepoznati iscrpljenost na radu pre nego što postane kriza.",
    "8 min čitanja",
    "stres-i-burnout",
    ["burnout-na-radu"],
    ["razumevanje"],
    "public",
    7,
  ),
  card(
    "b2",
    "Radni list",
    "Plan obnove energije za četiri nedelje",
    "Male, održive izmene raspoređene po nedeljama.",
    "PDF · 6 strana",
    "stres-i-burnout",
    ["burnout-na-radu", "hronicni-stres"],
    ["alati"],
    "registered",
    8,
  ),
  card(
    "b3",
    "Program",
    "Vraćanje energije",
    "Program u četiri nedelje, online, uz vođenje terapeuta.",
    "4 nedelje · online",
    "stres-i-burnout",
    ["burnout-na-radu"],
    ["program"],
    "public",
    9,
  ),
  card(
    "c1",
    "Vodič",
    "Granice bez osećaja krivice",
    "Šta granica jeste, a šta nije — i kako je izgovoriti naglas.",
    "6 min čitanja",
    "samopouzdanje-i-granice",
    ["postavljanje-granica", "osecaj-krivice"],
    ["razumevanje", "alati"],
    "public",
    10,
  ),
  card(
    "c2",
    "Audio vežba",
    "Vežba za trenutke samokritike",
    "Kratka vežba samosaosećanja za dan kada je glas u glavi strog.",
    "9 min",
    "samopouzdanje-i-granice",
    ["samopostovanje"],
    ["alati"],
    "public",
    11,
  ),
  card(
    "c3",
    "Knjiga",
    "Preporučena literatura o granicama",
    "Izbor knjiga koje naši terapeuti najčešće preporučuju.",
    "3 naslova",
    "samopouzdanje-i-granice",
    ["postavljanje-granica"],
    ["razumevanje"],
    "public",
    12,
  ),
  card(
    "d1",
    "Vodič",
    "Isti konflikt, po deseti put",
    "Kako prepoznati obrazac koji se ponavlja u odnosu.",
    "7 min čitanja",
    "partnerski-odnosi",
    ["konflikti", "komunikacija-u-vezi"],
    ["razumevanje"],
    "public",
    13,
  ),
  card(
    "d2",
    "Radni list",
    "Razgovor koji odlažete",
    "Struktura za jedan težak razgovor, u pet koraka.",
    "PDF · 3 strane",
    "partnerski-odnosi",
    ["komunikacija-u-vezi"],
    ["alati"],
    "public",
    14,
  ),
  card(
    "d3",
    "Radionica",
    "Bliskost i poverenje u paru",
    "Radionica za parove, uživo, mali broj mesta.",
    "2 sata",
    "partnerski-odnosi",
    ["bliskost-i-poverenje"],
    ["program"],
    "registered",
    15,
  ),
  card(
    "e1",
    "Vodič",
    "Kada roditelj ostane bez strpljenja",
    "O roditeljskom stresu bez saveta koji krive roditelja.",
    "8 min čitanja",
    "roditeljstvo",
    ["roditeljski-stres"],
    ["razumevanje"],
    "public",
    16,
  ),
  card(
    "e2",
    "Video",
    "Granice sa decom, bez podizanja glasa",
    "Primeri iz svakodnevnih situacija.",
    "14 min",
    "roditeljstvo",
    ["granice-sa-decom"],
    ["alati", "razumevanje"],
    "public",
    17,
  ),
  card(
    "e3",
    "Radionica",
    "Razumeti adolescenta",
    "Radionica za roditelje tinejdžera, online.",
    "2 sata · online",
    "roditeljstvo",
    ["podrska-adolescentu"],
    ["program"],
    "public",
    18,
  ),
  card(
    "f1",
    "Vodič",
    "Tugovanje nema raspored",
    "Šta je uobičajeno u tugovanju i kada podrška pomaže.",
    "9 min čitanja",
    "tugovanje-i-gubitak",
    ["gubitak-bliznjeg"],
    ["razumevanje"],
    "public",
    19,
  ),
  card(
    "f2",
    "Audio vežba",
    "Vežba za teške večeri",
    "Umirujuća vežba za trenutke kada je najteže.",
    "10 min",
    "tugovanje-i-gubitak",
    ["gubitak-bliznjeg", "razvod-i-rastanak"],
    ["alati"],
    "public",
    20,
  ),
  card(
    "g1",
    "Vodič",
    "Šta emocije pokušavaju da kažu",
    "Osnove emocionalne regulacije, bez tehničkog jezika.",
    "7 min čitanja",
    "emocionalna-regulacija",
    ["intenzivne-emocije"],
    ["razumevanje"],
    "public",
    21,
  ),
  card(
    "g2",
    "Radni list",
    "Skala napetosti od 0 do 10",
    "Alat za prepoznavanje trenutka kada je regulacija još moguća.",
    "PDF · 2 strane",
    "emocionalna-regulacija",
    ["intenzivne-emocije", "ljutnja"],
    ["alati"],
    "public",
    22,
  ),
];

export const compassFallbackRegistry: CompassRegistry = {
  areas: fallbackAreas,
  audiences: fallbackAudiences,
  goals: fallbackGoals,
  journeys: fallbackJourneys,
  content: fallbackContent,
};
