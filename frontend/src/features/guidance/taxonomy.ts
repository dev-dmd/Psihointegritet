export const SUPPORT_AREA_IDS = [
  "anxiety_stress",
  "relationships",
  "parenting",
  "trauma_crisis",
  "personal_growth",
] as const;

export type SupportAreaId = (typeof SUPPORT_AREA_IDS)[number];

export const SUPPORT_AREA_LABELS: Record<SupportAreaId, string> = {
  anxiety_stress: "Stres i anksioznost",
  relationships: "Odnosi i partnerske teme",
  parenting: "Roditeljstvo",
  trauma_crisis: "Trauma i krizna iskustva",
  personal_growth: "Lični rast i razvoj",
};

export const ADDICTION_RELATED_SUPPORT = "addiction_related_support" as const;
