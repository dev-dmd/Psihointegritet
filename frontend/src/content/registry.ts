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
import * as homepageEn from "./en/homepage";
import * as servicesEn from "./en/services";
import { therapists as therapistsEn } from "./en/therapists";
import * as workspaceEn from "./en/workspace-demo";
import type {
  ServiceCatalogItem,
  SessionPackage,
  SupportArea,
} from "./services";
import * as homepageSrLatn from "./sr-Latn/homepage";
import * as servicesSrLatn from "./sr-Latn/services";
import { therapists as therapistsSrLatn } from "./sr-Latn/therapists";
import * as workspaceSrLatn from "./sr-Latn/workspace-demo";

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

export interface FallbackContent {
  homepage: HomepageFallbackContent;
  services: ServicesFallbackContent;
  therapists: Therapist[];
  workspaceDemo: typeof workspaceEn | typeof workspaceSrLatn;
}

const REGISTRY: Record<UiLocale, FallbackContent> = {
  en: {
    homepage: homepageEn,
    services: servicesEn,
    therapists: therapistsEn,
    workspaceDemo: workspaceEn,
  },
  "sr-Latn": {
    homepage: homepageSrLatn,
    services: servicesSrLatn,
    therapists: therapistsSrLatn,
    workspaceDemo: workspaceSrLatn,
  },
};

/** Pure boundary for tests, client hooks and callers that already own locale. */
export function getFallbackContentForLocale(locale: UiLocale): FallbackContent {
  return REGISTRY[locale];
}
