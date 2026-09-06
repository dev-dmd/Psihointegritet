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
import type { UiLocale } from "@/i18n/locales";
import type { Therapist } from "@/types/therapist";

import type {
  ClientLink,
  CompaniesContent,
  FaqItem,
  FirstSessionStep,
  NavLink,
  ReasonCard,
  ResourceArticle,
  TrustItem,
  WorkshopFact,
} from "./homepage";
import type {
  ServiceCatalogItem,
  SessionPackage,
  SupportArea,
} from "./services";

export const CONTENT_PACK_IDS = [
  "psihointegritet",
  "mental-health-starter",
  "blank",
] as const;

export type ContentPackId = (typeof CONTENT_PACK_IDS)[number];
export type DemoDataMode = "showcase" | "empty" | "off";
export type ContentSourceStatus =
  "draft" | "in_review" | "approved" | "published" | "missing" | "showcase";

export interface ContentPackMetadata {
  packId: ContentPackId;
  locale: UiLocale;
  demoDataMode: DemoDataMode;
  /** Source/review status only. It does not grant publication approval. */
  sourceStatus: {
    publicSite: ContentSourceStatus;
    therapists: ContentSourceStatus;
    services: ContentSourceStatus;
    companies: ContentSourceStatus;
    research: ContentSourceStatus;
    compass: ContentSourceStatus;
    legal: ContentSourceStatus;
  };
  /** Staff-only help. Public renderers never read this object. */
  editorGuidance: {
    homepage: string;
    services: string;
    therapists: string;
  };
}

export interface HomepageFallbackContent {
  companies: CompaniesContent;
  clientLink: ClientLink;
  footerServiceLinks: NavLink[];
  trustItems: TrustItem[];
  reasons: ReasonCard[];
  firstSessionSteps: FirstSessionStep[];
  workshopFacts: WorkshopFact[];
  resources: ResourceArticle[];
  faqItems: FaqItem[];
}

export interface ServicesFallbackContent {
  serviceCatalog: ServiceCatalogItem[];
  PRICE_NOTE: string;
  sessionPackages: SessionPackage[];
  supportAreas: SupportArea[];
}

export interface ResearchDemoSurvey {
  name: string;
  period: string;
  responses: number;
  questions: Array<{
    q: string;
    bars: Array<{ label: string; pct: number }>;
  }>;
  open: string[];
}

export interface WorkspaceDemoContent {
  priorityCards: PriorityCard[];
  todayAgenda: AgendaEntry[];
  weekBars: WeekBar[];
  researchStats: Array<{ label: string; value: string }>;
  researchSurvey: ResearchDemoSurvey;
  appointmentRequests: AppointmentRequest[];
  waitlist: WaitlistEntry[];
  clients: Client[];
  unassignedRequests: UnassignedRequest[];
  companyPipeline: string[];
  companies: Company[];
  serviceCatalog: ServiceRow[];
  therapistCards: TherapistCard[];
  matchingPreferences: {
    ageGroups: string;
    maxNewMonthly: string;
    priority: string;
    cities: string;
    notAccepting: string[];
    toggles: Array<{ label: string; on: boolean }>;
    formatNote: string;
  };
  availabilityLayers: AvailabilityLayer[];
}

export interface FallbackContent {
  metadata: ContentPackMetadata;
  homepage: HomepageFallbackContent;
  services: ServicesFallbackContent;
  therapists: Therapist[];
  workspaceDemo: WorkspaceDemoContent;
}

export type ContentPack = Record<UiLocale, FallbackContent>;
