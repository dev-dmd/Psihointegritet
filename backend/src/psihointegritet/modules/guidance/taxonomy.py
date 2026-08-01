from enum import StrEnum


class SupportAreaId(StrEnum):
    ANXIETY_STRESS = "anxiety_stress"
    RELATIONSHIPS = "relationships"
    PARENTING = "parenting"
    TRAUMA_CRISIS = "trauma_crisis"
    PERSONAL_GROWTH = "personal_growth"


SUPPORT_AREA_IDS = tuple(area.value for area in SupportAreaId)

SUPPORT_AREA_LABELS: dict[SupportAreaId, str] = {
    SupportAreaId.ANXIETY_STRESS: "Stres i anksioznost",
    SupportAreaId.RELATIONSHIPS: "Odnosi i partnerske teme",
    SupportAreaId.PARENTING: "Roditeljstvo",
    SupportAreaId.TRAUMA_CRISIS: "Trauma i krizna iskustva",
    SupportAreaId.PERSONAL_GROWTH: "Lični rast i razvoj",
}

ADDICTION_RELATED_SUPPORT = "addiction_related_support"
