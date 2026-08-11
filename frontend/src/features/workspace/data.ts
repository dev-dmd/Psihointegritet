import { therapists } from "@/content/therapists";
import { emptyRichDoc } from "@/lib/content-governance/rich-doc";

import type { LegalDocument } from "./legal-documents";
import type {
  AgendaEntry,
  AppointmentRequest,
  AvailabilityLayer,
  Client,
  Company,
  PriorityCard,
  ServiceRow,
  TherapistCard,
  UnassignedRequest,
  WaitlistEntry,
  WeekBar,
} from "./types";

/**
 * Control Center demo data. Names/dates are illustrative; service names and
 * prices follow OUR corrected catalog (D-025: „Bračno savetovanje",
 * 4.000/5.500/5.000) and therapist info comes from `content/therapists.ts`,
 * not the prototype's outdated copy. Everything is mock — no persistence.
 */

const MARIA = "maria-bullock";
const ELSA = "elsa-browers";
const JOHN = "john-francis";

export const priorityCards: PriorityCard[] = [
  {
    count: "3",
    title: "Zahteva čeka potvrdu",
    description: "Najstariji je poslat pre 4 sata.",
    cta: "Pregledaj zahteve",
    routeId: "workspace.appointments.list",
    dot: "warm",
  },
  {
    count: "2",
    title: "Nedodeljena klijenta",
    description: "Intake bez automatske preporuke.",
    cta: "Otvori listu",
    routeId: "workspace.clients.list",
    dot: "warm",
  },
  {
    count: "1",
    title: "Novi upit kompanije",
    description: "Hotel Ambasador — stigao juče.",
    cta: "Otvori kompanije",
    routeId: "workspace.companies.list",
    dot: "meadow",
    adminOnly: true,
  },
  {
    count: "1",
    title: "Otkazan termin",
    description: "Jelena I. — sreda u 10:00.",
    cta: "Vidi termine",
    routeId: "workspace.appointments.list",
    dot: "danger",
  },
];

export const todayAgenda: AgendaEntry[] = [
  {
    time: "09:00",
    end: "10:00",
    client: "Ana Marković",
    initials: "AM",
    service: "Individualna psihoterapija",
    format: "Online",
    therapist: "Maria B.",
    therapistSlug: MARIA,
    source: "Javni booking",
    status: "potvrdjen",
  },
  { time: "11:00", free: true },
  {
    time: "13:30",
    end: "14:30",
    client: "Marko Petrović",
    initials: "MP",
    service: "Individualna psihoterapija",
    format: "Uživo · Chicago",
    therapist: "Maria B.",
    therapistSlug: MARIA,
    source: "Javni booking",
    status: "ceka",
  },
  {
    time: "16:00",
    end: "17:00",
    client: "Rezervisan kapacitet",
    initials: "TN",
    service: "Kompanijski program — TechCore",
    format: "Online",
    therapist: "John F.",
    therapistSlug: JOHN,
    source: "Kompanijski program",
    status: "rezervisano",
  },
  {
    time: "17:30",
    end: "18:30",
    client: "Jelena Ilić",
    initials: "JI",
    service: "Bračno savetovanje",
    format: "Online",
    therapist: "John F.",
    therapistSlug: JOHN,
    source: "Vođeni izbor",
    status: "potvrdjen",
  },
];

export const weekBars: WeekBar[] = [
  { day: "Pon", booked: 3, total: 6 },
  { day: "Uto", booked: 4, total: 6 },
  { day: "Sre", booked: 2, total: 6 },
  { day: "Čet", booked: 5, total: 6 },
  { day: "Pet", booked: 2, total: 6 },
];

export const appointmentRequests: AppointmentRequest[] = [
  {
    id: 1,
    client: "Nikola Đorđević",
    initials: "NĐ",
    service: "Individualna psihoterapija",
    preferred: "Uto, 21. jul · 10:00",
    format: "Online",
    therapist: "Maria B.",
    ago: "pre 4 sata",
    source: "Javni booking",
    status: "ceka",
  },
  {
    id: 2,
    client: "Tamara Kostić",
    initials: "TK",
    service: "Roditeljsko savetovanje",
    preferred: "Sre, 22. jul · 17:00",
    format: "Uživo · Chicago",
    therapist: "Elsa B.",
    ago: "pre 2 sata",
    source: "Vođeni izbor",
    status: "ceka",
  },
  {
    id: 3,
    client: "Stefan Živković",
    initials: "SŽ",
    service: "Bračno savetovanje",
    preferred: "Pet, 24. jul · 19:00",
    format: "Online",
    therapist: "John F.",
    ago: "pre 45 minuta",
    source: "Preporuka",
    status: "ceka",
  },
];

export const waitlist: WaitlistEntry[] = [
  {
    client: "Ivana Ristić",
    initials: "IR",
    period: "Radnim danima posle 17h",
    format: "Online",
    therapist: "Maria B.",
  },
  {
    client: "Miloš Antić",
    initials: "MA",
    period: "Vikendom prepodne",
    format: "Uživo · Chicago",
    therapist: "Bilo koji terapeut",
  },
];

export const clients: Client[] = [
  {
    id: "c1",
    name: "Ana Marković",
    initials: "AM",
    therapist: "Maria Bullock",
    therapistSlug: MARIA,
    next: "Čet, 24. jul · 17:00",
    service: "Individualna psihoterapija",
    format: "Online",
    status: "aktivan",
  },
  {
    id: "c2",
    name: "Marko Petrović",
    initials: "MP",
    therapist: "Maria Bullock",
    therapistSlug: MARIA,
    next: "Danas · 13:30",
    service: "Individualna psihoterapija",
    format: "Uživo",
    status: "aktivan",
  },
  {
    id: "c3",
    name: "Jelena Ilić",
    initials: "JI",
    therapist: "John Francis",
    therapistSlug: JOHN,
    next: "Danas · 17:30",
    service: "Bračno savetovanje",
    format: "Online",
    status: "aktivan",
  },
  {
    id: "c4",
    name: "Tamara Kostić",
    initials: "TK",
    therapist: "Elsa Browers",
    therapistSlug: ELSA,
    next: "Nema budući termin",
    service: "Roditeljsko savetovanje",
    format: "Uživo",
    status: "aktivan",
  },
  {
    id: "c5",
    name: "Petar Stanković",
    initials: "PS",
    therapist: "John Francis",
    therapistSlug: JOHN,
    next: "Nema budući termin",
    service: "Individualna psihoterapija",
    format: "Online",
    status: "neaktivan",
  },
  {
    id: "c6",
    name: "Milica Pavlović",
    initials: "MP",
    therapist: "Maria Bullock",
    therapistSlug: MARIA,
    next: "Pon, 28. jul · 09:00",
    service: "Individualna psihoterapija · TechCore",
    format: "Online",
    status: "aktivan",
  },
];

export const unassignedRequests: UnassignedRequest[] = [
  {
    id: "u1",
    initials: "S. J.",
    date: "18. jul",
    ago: "pre 1 dan",
    format: "Online",
    ageGroup: "25–34",
    areas: ["Anksioznost", "Burnout"],
    recommended: "Maria B. ili John F.",
    reason: "Dva terapeuta imaju podjednako poklapanje oblasti.",
  },
  {
    id: "u2",
    initials: "D. M.",
    date: "19. jul",
    ago: "pre 3 sata",
    format: "Uživo · Chicago",
    ageGroup: "35–44",
    areas: ["Partnerski odnosi"],
    recommended: "John F.",
    reason: "Traženi termin je van radnog vremena terapeuta.",
  },
];

export const companyPipeline = [
  "Novi upit",
  "Ponuda poslata",
  "Pilot program",
  "Aktivna",
];

export const companies: Company[] = [
  {
    id: "k1",
    name: "TechCore Inc.",
    status: "koAktivna",
    contact: "Milena Stojanović · HR menadžerka",
    model: "Fleksibilni fond individualnih termina",
    bought: 20,
    used: 12,
    employees: 85,
    format: "Online + uživo",
    location: "Chicago",
    goal: "Prevencija burnouta i podrška timovima u pikovima projekata.",
    expires: "31. dec 2026.",
  },
  {
    id: "k2",
    name: "Agrolek",
    status: "koPilot",
    contact: "Dragan Simić · direktor",
    model: "Program po meri",
    bought: 8,
    used: 3,
    employees: 32,
    format: "Uživo",
    location: "Milwaukee",
    goal: "Pilot: individualna podrška za smenske timove.",
    expires: "30. sep 2026.",
  },
  {
    id: "k3",
    name: "Balkan Soft",
    status: "koPonuda",
    contact: "Ivana Nikolić · office menadžerka",
    model: "Interaktivna radionica za tim",
    bought: 0,
    used: 0,
    employees: 54,
    format: "Online",
    location: "Chicago",
    goal: "Radionice + fond termina za zaposlene.",
    expires: "—",
  },
  {
    id: "k4",
    name: "Hotel Ambasador",
    status: "koNovi",
    contact: "Upit preko sajta · juče",
    model: "Još nije definisan",
    bought: 0,
    used: 0,
    employees: 40,
    format: "—",
    location: "Chicago",
    goal: "Upit: podrška za uslužni tim tokom sezone.",
    expires: "—",
  },
];

export const serviceCatalog: ServiceRow[] = [
  {
    name: "Individualna psihoterapija",
    code: "IND-60",
    status: "usAktivna",
    duration: "60 min",
    price: "4.000 RSD",
    format: "Online i uživo",
    therapists: "Maria · Elsa · John",
    variants: [
      "Standardna · 4.000",
      "Kompanijska · 4.800",
      "Paket 5× · 15.000",
    ],
    manual: "Ne",
    buffer: "12h",
    cancel: "24h",
  },
  {
    name: "Bračno savetovanje",
    code: "BRA-90",
    status: "usAktivna",
    duration: "90 min",
    price: "5.500 RSD",
    format: "Online i uživo",
    therapists: "Maria · John",
    variants: ["Standardna · 5.500"],
    manual: "Ne",
    buffer: "12h",
    cancel: "24h",
  },
  {
    name: "Roditeljsko savetovanje",
    code: "ROD-60",
    status: "usAktivna",
    duration: "60 min",
    price: "5.000 RSD",
    format: "Online i uživo",
    therapists: "Maria · Elsa",
    variants: ["Standardna · 5.000"],
    manual: "Ne",
    buffer: "12h",
    cancel: "24h",
  },
  {
    name: "Radionica — Prevencija burnouta",
    code: "RAD-B1",
    status: "usPriprema",
    duration: "120 min",
    price: "Cena po ponudi",
    format: "Uživo · kompanije",
    therapists: "Maria",
    variants: ["Kompanijska · po ponudi"],
    manual: "Da",
    buffer: "72h",
    cancel: "7 dana",
  },
];

export const researchStats: { label: string; value: string }[] = [
  { label: "Otvoreni draweri", value: "412" },
  { label: "Započeti odgovori", value: "168" },
  { label: "Završeni odgovori", value: "121" },
  { label: "Completion rate", value: "72%" },
];

export const researchSurvey = {
  name: "Šta vas sprečava da zakažete prvi razgovor?",
  period: "1 — 19. jul 2026.",
  responses: 121,
  questions: [
    {
      q: "1 · Najveća prepreka za dolazak",
      bars: [
        { label: "Nesigurnost šta da očekujem", pct: 34 },
        { label: "Cena", pct: 28 },
        { label: "Nedostatak vremena", pct: 22 },
        { label: "Neprijatnost / stigma", pct: 16 },
      ],
    },
    {
      q: "2 · Preferirani format rada",
      bars: [
        { label: "Online", pct: 58 },
        { label: "Uživo", pct: 30 },
        { label: "Svejedno mi je", pct: 12 },
      ],
    },
  ],
  open: [
    'Nisam sigurna da li je moj problem „dovoljno ozbiljan" za terapiju.',
    "Voleo bih kratak besplatan poziv pre prve seanse.",
  ],
};

/** Therapist cards — real people from content/therapists.ts + demo load figures. */
const LOAD: Record<
  string,
  { clients: number; occupancy: number; accepting: boolean }
> = {
  [MARIA]: { clients: 14, occupancy: 82, accepting: true },
  [ELSA]: { clients: 11, occupancy: 64, accepting: true },
  [JOHN]: { clients: 12, occupancy: 71, accepting: false },
};

export const therapistCards: TherapistCard[] = therapists.map((t) => ({
  slug: t.slug,
  name: t.name,
  title: t.title,
  image: t.image,
  badge: t.badge,
  clients: LOAD[t.slug]?.clients ?? 0,
  occupancy: LOAD[t.slug]?.occupancy ?? 0,
  acceptingNew: LOAD[t.slug]?.accepting ?? true,
}));

/**
 * „Moj profil" demo — shows the first therapist (Maria) as the signed-in
 * therapist. Once the backend maps the Clerk user to a therapist record, this
 * resolves to the actual logged-in person.
 */
export const myProfileSlug = MARIA;

export const matchingPreferences = {
  ageGroups: "Odrasli 18–65",
  maxNewMonthly: "3",
  priority: "Visok",
  cities: "Chicago · online",
  notAccepting: ["Zavisnosti", "Deca do 16 godina"],
  toggles: [
    { label: "Prima nove klijente", on: true },
    { label: "Kompanijski programi", on: true },
    { label: "Radionice", on: false },
  ],
  formatNote: "Oba formata",
};

export const availabilityLayers: AvailabilityLayer[] = [
  {
    index: 1,
    title: "Radno vreme",
    body: "Ponedeljak i sreda · 14:00 — 20:00\nUtorak i četvrtak · 10:00 — 16:00\nPetak · 10:00 — 14:00",
  },
  {
    index: 2,
    title: "Raspoloživi slotovi",
    body: "Generišu se iz radnog vremena: 60 min + 15 min pauze. Klijent u javnom bookingu vidi samo ovo. — 18 slotova ove nedelje.",
  },
  {
    index: 3,
    title: "Izuzeci",
    body: "Godišnji odmor · 3 — 14. avgust\nKonferencija · Beograd · 25. jul",
  },
  {
    index: 4,
    title: "Rezervisani kapacitet",
    body: "TechCore Inc. · Četvrtak · 16:00 — 18:00. Nedostupno javnom bookingu — koristi se samo kroz kompanijski program.",
  },
];

/**
 * Seed documents for the registry preview (LD-3). Deliberately unfinished:
 * the two Intake consent texts exist as empty drafts so the panel shows the
 * gate closed and names exactly what is missing. We do not write legal text
 * (master plan §0, point 8) — the centre owner and the lawyer fill these in.
 */
export const seedLegalDocuments: LegalDocument[] = [
  {
    documentId: "doc-obavestenje-o-obradi-podataka",
    revisionId: "doc-obavestenje-o-obradi-podataka-r1",
    kind: "intake_data_processing_notice",
    management: "document",
    title: "Obaveštenje o obradi podataka",
    slug: "obavestenje-o-obradi-podataka",
    body: emptyRichDoc(),
    status: "draft",
    approvals: [],
    versionLabel: "v1",
    updatedAt: "2026-07-26T09:00:00.000Z",
  },
  {
    documentId: "doc-zahtev-nije-termin",
    revisionId: "doc-zahtev-nije-termin-r1",
    kind: "intake_request_acknowledgement",
    management: "document",
    title: "Potvrda da zahtev nije termin",
    slug: "zahtev-nije-termin",
    body: emptyRichDoc(),
    status: "draft",
    approvals: [],
    versionLabel: "v1",
    updatedAt: "2026-07-26T09:00:00.000Z",
  },
];
