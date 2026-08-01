import type {
  ActivityItem,
  FeatureGate,
  HealthService,
  PlatformStat,
  Tenant,
  UsageTile,
} from "./types";

/**
 * Mock data verbatim from the design prototype (Psihointegritet
 * Superadmin.dc.html). Every value here is demo content — the first version
 * intentionally hardcodes stats/health per the phase brief; real collectors
 * arrive with backend M2.7 (diagnostics) and R6 (gates/billing).
 */

export const APP_VERSION = "v0.4.2 · produkcija";

export const LAST_CHECK_INITIAL = "danas · 09:41";

export const platformStats: PlatformStat[] = [
  { value: "1", label: "Aktivni tenanti", dot: "meadow" },
  { value: "24", label: "Aktivni korisnici", dot: "meadow" },
  { value: "3", label: "Terapeuti", dot: "meadow" },
  { value: "20", label: "Klijenti", dot: "meadow" },
  { value: "5", label: "Termini danas", dot: "meadow" },
  { value: "3", label: "Zahteva čeka", dot: "warm" },
  { value: "2", label: "Neuspele email poruke", dot: "warm" },
  { value: "1", label: "Sistemsko upozorenje", dot: "danger" },
];

export const healthServices: HealthService[] = [
  { name: "Frontend", meta: "Vercel · 78 ms", status: "op" },
  { name: "Backend API", meta: "Railway · 124 ms", status: "op" },
  { name: "PostgreSQL", meta: "12 ms", status: "op" },
  { name: "Redis", meta: "Upstash · 3 ms", status: "op" },
  { name: "QStash", meta: "queue prazan", status: "op" },
  { name: "Resend", meta: "retry aktivan", status: "deg" },
  { name: "Clerk", meta: "96 ms", status: "op" },
];

export const psihointegritetTenant: Tenant = {
  id: "psihointegritet",
  name: "Psihointegritet",
  slug: "psihointegritet",
  domain: "psihointegritet.com",
  owner: "Anja Stamenković",
  plan: "Partner / Development",
  status: "active",
  trial: "Trial do 30. sep 2026.",
  therapists: 3,
  clients: 20,
  appointments: 214,
  created: "12. maj 2026.",
  lastActivity: "danas · 09:41",
  engines: [
    "Intake & Matching",
    "Booking",
    "Company Programs",
    "Research Drawer",
    "Research Analytics",
    "White-label",
  ],
  note: "Development partner — cena i uslovi po dogovoru. Kontakt ide preko Anje; tehničke izmene najavljivati unapred.",
};

export const usageTiles: UsageTile[] = [
  { value: "1.240", label: "AI zahteva" },
  { value: "312", label: "Poslatih emailova" },
  { value: "1,2 GB", label: "Storage" },
  { value: "24", label: "Korisnika" },
  { value: "214", label: "Termina" },
  { value: "18,4k", label: "API poziva" },
  { value: "1.032", label: "Background jobs" },
  { value: "0", label: "Neuspelih jobs" },
];

export const initialGates: FeatureGate[] = [
  {
    id: "g1",
    name: "Intake & Matching",
    description: "Vođeni izbor i preporuka terapeuta",
    status: "on",
    minPlan: "Partner",
    tenantOverride: "—",
  },
  {
    id: "g2",
    name: "Booking Engine",
    description: "Javno zakazivanje i statusi termina",
    status: "on",
    minPlan: "Core",
    tenantOverride: "—",
  },
  {
    id: "g3",
    name: "Company Programs",
    description: "Kompanijski fondovi i pozivnice",
    status: "on",
    minPlan: "Partner",
    tenantOverride: "—",
  },
  {
    id: "g4",
    name: "Research Drawer",
    description: "Ankete na javnom sajtu",
    status: "on",
    minPlan: "Core",
    tenantOverride: "—",
  },
  {
    id: "g5",
    name: "Research Analytics",
    description: "Analitika odgovora i filteri",
    status: "on",
    minPlan: "Partner",
    tenantOverride: "Ručno uključen · 1. jul",
  },
  {
    id: "g6",
    name: "Marketing Engine",
    description: "Kampanje i kanali akvizicije",
    status: "coming_soon",
    minPlan: "Growth",
    tenantOverride: "—",
  },
  {
    id: "g7",
    name: "Blog Engine",
    description: "Objave i biblioteka sadržaja",
    status: "coming_soon",
    minPlan: "Growth",
    tenantOverride: "—",
  },
  {
    id: "g8",
    name: "Loyalty Engine",
    description: "Paketi, krediti i pogodnosti",
    status: "off",
    minPlan: "Growth",
    tenantOverride: "—",
  },
  {
    id: "g9",
    name: "White-label domen",
    description: "Sopstveni domen tenanta",
    status: "on",
    minPlan: "Partner",
    tenantOverride: "psihointegritet.com",
  },
];

export const initialActivity: ActivityItem[] = [
  {
    title: "Neuspešno slanje emaila — potvrda termina",
    detail: "danas · 08:12 · resend retry zakazan",
    kind: "err",
  },
  {
    title: "Uključen feature gate — Research Analytics",
    detail: "1. jul · superadmin · razlog: dogovor sa vlasnicom",
    kind: "gate",
  },
  {
    title: "Deployment frontend v0.4.2",
    detail: "juče · 22:40 · Vercel",
    kind: "sys",
  },
  {
    title: "Dodat terapeut — Marjan Janković",
    detail: "2. jun · tenant psihointegritet",
    kind: "ok",
  },
  {
    title: "Kreiran tenant — Psihointegritet",
    detail: "12. maj · superadmin",
    kind: "ok",
  },
];

/** „Aplikacija — poslednja 24h" values (diagnostics). */
export const app24h = {
  lastBooking: "09:41 · uspešan",
  lastEmail: "08:12 · neuspešan, retry",
  failedEmails: "2",
  apiErrors: "3",
  apiErrorsShare: "(0,2%)",
  slowOperations: "1",
  unprocessedIntake: "2",
};

/** Tenant health rows (diagnostics right column). */
export const tenantHealthRows: {
  label: string;
  value: string;
  tone: "ok" | "warn" | "muted";
}[] = [
  { label: "Domen", value: "psihointegritet.com ✓", tone: "ok" },
  { label: "SSL sertifikat", value: "važi do 14. okt ✓", tone: "ok" },
  { label: "Backend konekcija", value: "124 ms ✓", tone: "ok" },
  { label: "Email konfiguracija", value: "DKIM ⚠ proveriti", tone: "warn" },
  { label: "Aktivni feature gate-ovi", value: "6 / 9", tone: "muted" },
  { label: "Zakazani poslovi", value: "svi na rasporedu ✓", tone: "ok" },
  { label: "Poslednja aktivnost", value: "danas · 09:41", tone: "muted" },
];

export const tenantHealthFinding =
  "2 emaila nisu isporučena (DKIM upozorenje). Preporuka: proveriti DNS zapise domena — automatska popravka je planirana za kasniju fazu.";
