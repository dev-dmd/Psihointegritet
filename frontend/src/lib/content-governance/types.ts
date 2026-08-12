import type { CompanyPlanCard } from "@/content/company";
import type { GroupProgram } from "@/content/programs";
import type { ServiceCatalogItem, SessionPackage } from "@/content/services";
import type { Therapist } from "@/types/therapist";

export const publicationStatuses = [
  "draft",
  "in_review",
  "approved",
  "published",
  "archived",
] as const;

export type PublicationStatus = (typeof publicationStatuses)[number];

export const availabilityStatuses = [
  "active",
  "coming_soon",
  "temporarily_unavailable",
  "retired",
] as const;

export type AvailabilityStatus = (typeof availabilityStatuses)[number];

export const indexingPolicies = ["index", "noindex"] as const;

export type IndexingPolicy = (typeof indexingPolicies)[number];

export const bookingModes = ["request", "slot_request", "disabled"] as const;

export type BookingMode = (typeof bookingModes)[number];

export const approvalCapabilities = ["clinical", "legal", "business"] as const;

export type ApprovalCapability = (typeof approvalCapabilities)[number];

export type ApprovalStatus = "pending" | "approved" | "rejected";

export interface ApprovalRequirement {
  capability: ApprovalCapability;
  required: boolean;
}

export interface ApprovalEvidence {
  capability: ApprovalCapability;
  status: ApprovalStatus;
  approvedByLabel?: string;
  approvedAt?: string;
  note?: string;
}

export type ContentType =
  | "static_page"
  | "service"
  | "therapist"
  | "program"
  | "company_plan"
  | "package_offer"
  // ADR-019. Unlike the six above, an article's identity is not an entry in the
  // system allowlist: it is one record per published text.
  | "article";

/**
 * Explicit ownership of a public content identity. Templates describe shape;
 * they never decide which CMS workflow owns the record.
 */
export type ContentManagement = "system" | "document" | "article" | "internal";

export type ContentTemplate =
  | "service_detail"
  | "therapist_profile"
  | "support_area"
  | "audience_page"
  | "program_detail"
  | "company_page"
  | "pricing_page"
  | "static_information"
  | "legal_page"
  // Recipe `article-v1` (ADR-021): the author picks which sections exist, the
  // recipe fixes the order they render in.
  | "article_detail";

export type ContentCharacterLimitKey =
  | "navigationLabel"
  | "ctaLabel"
  | "eyebrow"
  | "shortFact"
  | "pageH1"
  | "sectionH2"
  | "cardTitle"
  | "cardDescription"
  | "heroLead"
  | "sectionIntro"
  | "richParagraph"
  | "serviceDescription"
  | "therapistPublicTitle"
  | "therapistCardExcerpt"
  | "therapistQuote"
  | "therapistBioParagraph"
  | "therapistFullBio"
  | "faqQuestion"
  | "faqAnswer"
  | "seoTitle"
  | "seoDescription"
  | "imageAlt"
  | "articleBody"
  | "slug"
  | "redirectPath";

export interface ContentTextField {
  field: string;
  value: string;
  limit: ContentCharacterLimitKey;
}

export interface SeoFields {
  title: string;
  description: string;
  ogImageAssetId?: string;
}

export type CtaAction =
  | "START_MATCHING"
  | "BOOK_SERVICE"
  | "BOOK_THERAPIST"
  | "VIEW_SERVICE"
  | "VIEW_THERAPIST"
  | "VIEW_PROGRAM"
  | "JOIN_PROGRAM_WAITLIST"
  | "OPEN_COMPANY_CONFIGURATOR"
  | "VIEW_PRICING"
  | "GENERAL_CONTACT";

export interface CtaReference {
  label: string;
  action: CtaAction;
  targetId?: string;
}

export type WidgetId =
  | "matching"
  | "booking"
  | "company_configurator"
  | "program_interest"
  | "research_survey";

export interface WidgetPlacement {
  id: WidgetId;
  placement: string;
  enabled: boolean;
}

export type JsonLdKind =
  "organization" | "website" | "breadcrumb" | "person" | "service" | "faq";

export interface BreadcrumbItem {
  label: string;
  path: string;
}

export interface AssetReference {
  assetId: string;
  alt: string;
  decorative?: boolean;
}

export interface ContentEntityBase {
  id: string;
  type: ContentType;
  management: ContentManagement;
  route: string;
  canonicalSlug: string;
  publicationStatus: PublicationStatus;
  availabilityStatus?: AvailabilityStatus;
  indexingPolicy: IndexingPolicy;
  template: ContentTemplate;
  slots: readonly string[];
  requiredApprovals: readonly ApprovalRequirement[];
  approvalEvidence: readonly ApprovalEvidence[];
  seo: SeoFields;
  textFields: readonly ContentTextField[];
  ctas: readonly CtaReference[];
  widgets: readonly WidgetPlacement[];
  jsonLdKinds: readonly JsonLdKind[];
  breadcrumbs?: readonly BreadcrumbItem[];
  asset?: AssetReference;
  bookingMode?: BookingMode;
  bookingDisclaimerKey?: string;
}

export interface StaticPageEntity extends ContentEntityBase {
  type: "static_page";
  h1: string;
  faq?: readonly { question: string; answer: string }[];
}

export interface ServiceContentEntity extends ContentEntityBase {
  type: "service";
  source: ServiceCatalogItem;
  therapistIds: readonly string[];
}

export interface TherapistContentEntity extends ContentEntityBase {
  type: "therapist";
  source: Therapist;
}

export interface ProgramContentEntity extends ContentEntityBase {
  type: "program";
  source: GroupProgram;
}

export interface CompanyPlanContentEntity extends ContentEntityBase {
  type: "company_plan";
  source: CompanyPlanCard;
}

export interface PackageOfferContentEntity extends ContentEntityBase {
  type: "package_offer";
  source: SessionPackage;
}

export type ContentEntity =
  | StaticPageEntity
  | ServiceContentEntity
  | TherapistContentEntity
  | ProgramContentEntity
  | CompanyPlanContentEntity
  | PackageOfferContentEntity;

/**
 * The content types that have a checked-in `ContentEntity` variant.
 *
 * Deliberately narrower than `ContentType`: `article` is governed content but
 * not a `ContentEntity` (ADR-019 §12). Entities carry a static fallback, a
 * fixed route and a `source` object, all of which exist because those pages
 * ship with the repository. Articles are authored per record and read through
 * their own public endpoint, so widening this alias would force a fake
 * fallback for every published text.
 */
export type ContentEntityType = ContentEntity["type"];

export type ContentEntityOfType<T extends ContentEntityType> = Extract<
  ContentEntity,
  { type: T }
>;

export interface PublishedListQuery {
  type?: ContentEntityType;
}

export interface RedirectRecord {
  sourcePath: string;
  targetPath?: string;
  status: 301 | 308 | 404 | 410;
  reason: string;
}

export interface ContentProvider {
  getPageByRoute(route: string): ContentEntity | null;
  getEntity<T extends ContentEntityType>(
    type: T,
    id: string,
  ): ContentEntityOfType<T> | null;
  getEntityById(id: string): ContentEntity | null;
  listPublished(input?: PublishedListQuery): ContentEntity[];
  listAll(): ContentEntity[];
  getRedirect(sourcePath: string): RedirectRecord | null;
}

export type ContentHealthSeverity = "info" | "warning" | "error";

export interface ContentHealthFinding {
  ruleId: string;
  /** Additive in Content Health v0.2; omitted only by legacy/import adapters. */
  ruleVersion?: string;
  severity: ContentHealthSeverity;
  entityType: string;
  entityId: string;
  field?: string;
  message: string;
  recommendation: string;
  requiresApproval?: ApprovalCapability;
}

export interface PublishGateResult {
  canApprove: boolean;
  canPublish: boolean;
  canActivate: boolean;
  findings: ContentHealthFinding[];
}

export interface ContentHealthReport {
  schemaVersion: "1";
  generatedAt: string;
  summary: Record<ContentHealthSeverity, number>;
  findings: ContentHealthFinding[];
}
