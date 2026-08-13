import { therapists } from "@/content/en/therapists";
import { ELSA, JOHN, MARIA } from "@/features/workspace/demo-slugs";
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
} from "@/features/workspace/types";

/**
 * Control Center demo data in English.
 *
 * Everything that is not language stays byte-identical to the Serbian file:
 * times, slugs, counts, percentages and `status` values. Those address rows and
 * drive styling — translating them would break the screens rather than
 * localise them.
 */

export const priorityCards: PriorityCard[] = [
  {
    count: "3",
    title: "Requests awaiting confirmation",
    description: "The oldest was sent 4 hours ago.",
    cta: "Review requests",
    routeId: "workspace.appointments.list",
    dot: "warm",
  },
  {
    count: "2",
    title: "Unassigned clients",
    description: "Intake without an automatic recommendation.",
    cta: "Open the list",
    routeId: "workspace.clients.list",
    dot: "warm",
  },
  {
    count: "1",
    title: "New company enquiry",
    description: "Hotel Ambasador — arrived yesterday.",
    cta: "Open companies",
    routeId: "workspace.companies.list",
    dot: "meadow",
    adminOnly: true,
  },
  {
    count: "1",
    title: "Cancelled appointment",
    description: "Jelena I. — Wednesday at 10:00.",
    cta: "See appointments",
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
    service: "Individual psychotherapy",
    format: "Online",
    therapist: "Maria B.",
    therapistSlug: MARIA,
    source: "Public booking",
    status: "potvrdjen",
  },
  { time: "11:00", free: true },
  {
    time: "13:30",
    end: "14:30",
    client: "Marko Petrović",
    initials: "MP",
    service: "Individual psychotherapy",
    format: "In person · Chicago",
    therapist: "Maria B.",
    therapistSlug: MARIA,
    source: "Public booking",
    status: "ceka",
  },
  {
    time: "16:00",
    end: "17:00",
    client: "Reserved capacity",
    initials: "TN",
    service: "Company programme — TechCore",
    format: "Online",
    therapist: "John F.",
    therapistSlug: JOHN,
    source: "Company programme",
    status: "rezervisano",
  },
  {
    time: "17:30",
    end: "18:30",
    client: "Jelena Ilić",
    initials: "JI",
    service: "Couples counselling",
    format: "Online",
    therapist: "John F.",
    therapistSlug: JOHN,
    source: "Guided choice",
    status: "potvrdjen",
  },
];

export const weekBars: WeekBar[] = [
  { day: "Mon", booked: 3, total: 6 },
  { day: "Tue", booked: 4, total: 6 },
  { day: "Wed", booked: 2, total: 6 },
  { day: "Thu", booked: 5, total: 6 },
  { day: "Fri", booked: 2, total: 6 },
];

export const researchStats: { label: string; value: string }[] = [
  { label: "Drawers opened", value: "412" },
  { label: "Responses started", value: "168" },
  { label: "Responses completed", value: "121" },
  { label: "Completion rate", value: "72%" },
];

export const researchSurvey = {
  name: "What is stopping you from booking a first conversation?",
  period: "1 — 19 July 2026",
  responses: 121,
  questions: [
    {
      q: "1 · The biggest obstacle to coming in",
      bars: [
        { label: "Not knowing what to expect", pct: 34 },
        { label: "Price", pct: 28 },
        { label: "Lack of time", pct: 22 },
        { label: "Awkwardness / stigma", pct: 16 },
      ],
    },
    {
      q: "2 · Preferred format",
      bars: [
        { label: "Online", pct: 58 },
        { label: "In person", pct: 30 },
        { label: "No preference", pct: 12 },
      ],
    },
  ],
  open: [
    "I am not sure my problem is “serious enough” for therapy.",
    "I would like a short free call before the first session.",
  ],
};

export const appointmentRequests: AppointmentRequest[] = [
  {
    id: 1,
    client: "Nikola Đorđević",
    initials: "NĐ",
    service: "Individual psychotherapy",
    preferred: "Tue, 21 July · 10:00",
    format: "Online",
    therapist: "Maria B.",
    ago: "4 hours ago",
    source: "Public booking",
    status: "ceka",
  },
  {
    id: 2,
    client: "Tamara Kostić",
    initials: "TK",
    service: "Parent counselling",
    preferred: "Wed, 22 July · 17:00",
    format: "In person · Chicago",
    therapist: "Elsa B.",
    ago: "2 hours ago",
    source: "Guided choice",
    status: "ceka",
  },
  {
    id: 3,
    client: "Stefan Živković",
    initials: "SŽ",
    service: "Couples counselling",
    preferred: "Fri, 24 July · 19:00",
    format: "Online",
    therapist: "John F.",
    ago: "45 minutes ago",
    source: "Recommendation",
    status: "ceka",
  },
];

export const waitlist: WaitlistEntry[] = [
  {
    client: "Ivana Ristić",
    initials: "IR",
    period: "Weekdays after 17:00",
    format: "Online",
    therapist: "Maria B.",
  },
  {
    client: "Miloš Antić",
    initials: "MA",
    period: "Weekend mornings",
    format: "In person · Chicago",
    therapist: "Any therapist",
  },
];

export const clients: Client[] = [
  {
    id: "c1",
    name: "Ana Marković",
    initials: "AM",
    therapist: "Maria Bullock",
    therapistSlug: MARIA,
    next: "Thu, 24 July · 17:00",
    service: "Individual psychotherapy",
    format: "Online",
    status: "aktivan",
  },
  {
    id: "c2",
    name: "Marko Petrović",
    initials: "MP",
    therapist: "Maria Bullock",
    therapistSlug: MARIA,
    next: "Today · 13:30",
    service: "Individual psychotherapy",
    format: "In person",
    status: "aktivan",
  },
  {
    id: "c3",
    name: "Jelena Ilić",
    initials: "JI",
    therapist: "John Francis",
    therapistSlug: JOHN,
    next: "Today · 17:30",
    service: "Couples counselling",
    format: "Online",
    status: "aktivan",
  },
  {
    id: "c4",
    name: "Tamara Kostić",
    initials: "TK",
    therapist: "Elsa Browers",
    therapistSlug: ELSA,
    next: "No future appointment",
    service: "Parent counselling",
    format: "In person",
    status: "aktivan",
  },
  {
    id: "c5",
    name: "Petar Stanković",
    initials: "PS",
    therapist: "John Francis",
    therapistSlug: JOHN,
    next: "No future appointment",
    service: "Individual psychotherapy",
    format: "Online",
    status: "neaktivan",
  },
  {
    id: "c6",
    name: "Milica Pavlović",
    initials: "MP",
    therapist: "Maria Bullock",
    therapistSlug: MARIA,
    next: "Mon, 28 July · 09:00",
    service: "Individual psychotherapy · TechCore",
    format: "Online",
    status: "aktivan",
  },
];

export const unassignedRequests: UnassignedRequest[] = [
  {
    id: "u1",
    initials: "S. J.",
    date: "18 July",
    ago: "1 day ago",
    format: "Online",
    ageGroup: "25–34",
    areas: ["Anxiety", "Burnout"],
    recommended: "Maria B. or John F.",
    reason: "Two therapists match the support areas equally well.",
  },
  {
    id: "u2",
    initials: "D. M.",
    date: "19 July",
    ago: "3 hours ago",
    format: "In person · Chicago",
    ageGroup: "35–44",
    areas: ["Relationships"],
    recommended: "John F.",
    reason: "The requested time falls outside the therapist's working hours.",
  },
];

export const companyPipeline = [
  "New enquiry",
  "Proposal sent",
  "Pilot programme",
  "Active",
];

export const companies: Company[] = [
  {
    id: "k1",
    name: "TechCore Inc.",
    status: "koAktivna",
    contact: "Milena Stojanović · HR manager",
    model: "Flexible fund of individual appointments",
    bought: 20,
    used: 12,
    employees: 85,
    format: "Online + in person",
    location: "Chicago",
    goal: "Burnout prevention and support during project peaks.",
    expires: "31 Dec 2026",
  },
  {
    id: "k2",
    name: "Agrolek",
    status: "koPilot",
    contact: "Dragan Simić · director",
    model: "Tailored programme",
    bought: 8,
    used: 3,
    employees: 32,
    format: "In person",
    location: "Milwaukee",
    goal: "Pilot: individual support for shift-based teams.",
    expires: "30 Sep 2026",
  },
  {
    id: "k3",
    name: "Balkan Soft",
    status: "koPonuda",
    contact: "Ivana Nikolić · office manager",
    model: "Interactive team workshop",
    bought: 0,
    used: 0,
    employees: 54,
    format: "Online",
    location: "Chicago",
    goal: "Workshops plus an appointment fund for employees.",
    expires: "—",
  },
  {
    id: "k4",
    name: "Hotel Ambasador",
    status: "koNovi",
    contact: "Website enquiry · yesterday",
    model: "Not defined yet",
    bought: 0,
    used: 0,
    employees: 40,
    format: "—",
    location: "Chicago",
    goal: "Enquiry: support for a service team during the busy season.",
    expires: "—",
  },
];

export const serviceCatalog: ServiceRow[] = [
  {
    name: "Individual psychotherapy",
    code: "IND-60",
    status: "usAktivna",
    duration: "60 min",
    price: "RSD 4,000",
    format: "Online and in person",
    therapists: "Maria · Elsa · John",
    variants: ["Standard · 4,000", "Company · 4,800", "5× package · 15,000"],
    manual: "No",
    buffer: "12h",
    cancel: "24h",
  },
  {
    name: "Couples counselling",
    code: "BRA-90",
    status: "usAktivna",
    duration: "90 min",
    price: "RSD 5,500",
    format: "Online and in person",
    therapists: "Maria · John",
    variants: ["Standard · 5,500"],
    manual: "No",
    buffer: "12h",
    cancel: "24h",
  },
  {
    name: "Parent counselling",
    code: "ROD-60",
    status: "usAktivna",
    duration: "60 min",
    price: "RSD 5,000",
    format: "Online and in person",
    therapists: "Maria · Elsa",
    variants: ["Standard · 5,000"],
    manual: "No",
    buffer: "12h",
    cancel: "24h",
  },
  {
    name: "Workshop — Burnout prevention",
    code: "RAD-B1",
    status: "usPriprema",
    duration: "120 min",
    price: "Price on request",
    format: "In person · companies",
    therapists: "Maria",
    variants: ["Company · on request"],
    manual: "Yes",
    buffer: "72h",
    cancel: "7 days",
  },
];

const LOAD = {
  [MARIA]: { clients: 14, occupancy: 82, accepting: true },
  [ELSA]: { clients: 11, occupancy: 64, accepting: true },
  [JOHN]: { clients: 12, occupancy: 71, accepting: false },
};

export const therapistCards: TherapistCard[] = therapists.map((therapist) => ({
  slug: therapist.slug,
  name: therapist.name,
  title: therapist.title,
  image: therapist.image,
  badge: therapist.badge,
  clients: LOAD[therapist.slug as keyof typeof LOAD]?.clients ?? 0,
  occupancy: LOAD[therapist.slug as keyof typeof LOAD]?.occupancy ?? 0,
  acceptingNew: LOAD[therapist.slug as keyof typeof LOAD]?.accepting ?? true,
}));

export const matchingPreferences = {
  ageGroups: "Adults 18–65",
  maxNewMonthly: "3",
  priority: "High",
  cities: "Chicago · online",
  notAccepting: ["Addictions", "Children under 16"],
  toggles: [
    { label: "Accepting new clients", on: true },
    { label: "Company programmes", on: true },
    { label: "Workshops", on: false },
  ],
  formatNote: "Both formats",
};

export const availabilityLayers: AvailabilityLayer[] = [
  {
    index: 1,
    title: "Working hours",
    body: "Monday and Wednesday · 14:00–20:00\nTuesday and Thursday · 10:00–16:00\nFriday · 10:00–14:00",
  },
  {
    index: 2,
    title: "Available slots",
    body: "Generated from working hours: 60 min + 15 min break. Public booking shows only these slots. — 18 slots this week.",
  },
  {
    index: 3,
    title: "Exceptions",
    body: "Annual leave · 3–14 August\nConference · Belgrade · 25 July",
  },
  {
    index: 4,
    title: "Reserved capacity",
    body: "TechCore Inc. · Thursday · 16:00–18:00. Hidden from public booking and used only through the company programme.",
  },
];
