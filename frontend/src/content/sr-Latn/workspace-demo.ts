import type {
  AgendaEntry,
  PriorityCard,
  WeekBar,
} from "@/features/workspace/types";

import { JOHN, MARIA } from "@/features/workspace/demo-slugs";

/**
 * Control Center demo data in Serbian — the tenant's own language.
 *
 * Moved out of `features/workspace/data.ts` whole: this is the text as it read
 * before the split, not a re-translation of the English.
 */
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
