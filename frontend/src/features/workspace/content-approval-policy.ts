import type {
  ApprovalCapability,
  ContentTemplate,
  ContentType,
} from "@/lib/content-governance/types";

const BASE: Record<ContentType, readonly ApprovalCapability[]> = {
  static_page: ["business"],
  service: ["business"],
  therapist: ["clinical", "business"],
  program: ["business"],
  company_plan: ["business"],
  package_offer: ["business"],
};

const BY_TEMPLATE: Record<ContentTemplate, readonly ApprovalCapability[]> = {
  legal_page: ["legal"],
  therapist_profile: ["clinical"],
  support_area: ["clinical"],
  audience_page: ["clinical"],
  service_detail: [],
  program_detail: [],
  company_page: [],
  pricing_page: [],
  static_information: [],
};

export function requiredContentApprovals(
  type: ContentType,
  template: ContentTemplate,
): ApprovalCapability[] {
  return [...new Set([...BASE[type], ...BY_TEMPLATE[template]])];
}

export const CONTENT_APPROVAL_LABELS: Record<ApprovalCapability, string> = {
  business: "Poslovno",
  clinical: "Stručno",
  legal: "Pravno",
};
