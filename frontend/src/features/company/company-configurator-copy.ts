"use client";

import { useTranslations } from "next-intl";

import {
  COMPANY_FORMATS,
  COMPANY_GOALS,
  COMPANY_SIZES,
  COMPANY_TOPICS,
} from "@/content/company";

/** Localizes B2B presentation while preserving legacy answer values. */
export function useCompanyConfiguratorCopy() {
  const t = useTranslations("public.pages.companyConfigurator");
  const companies = useTranslations("public.pages.companies");

  const planTitle = (slug: string, fallback: string): string => {
    switch (slug) {
      case "pojedinacni-pristup":
        return companies("plans.individual.title");
      case "team-flex":
        return companies("plans.teamFlex.title");
      case "rezervisani-kapacitet":
        return companies("plans.reserved.title");
      case "program-po-meri":
        return companies("plans.custom.title");
      default:
        return fallback;
    }
  };

  const optionLabel = (option: string): string => {
    switch (option) {
      case COMPANY_SIZES.upTo20:
        return t("options.size.upTo20");
      case COMPANY_SIZES.s20_50:
        return t("options.size.between20And50");
      case COMPANY_SIZES.s50_200:
        return t("options.size.between50And200");
      case COMPANY_SIZES.over200:
        return t("options.size.over200");
      case COMPANY_GOALS.lecture:
        return t("options.goal.lecture");
      case COMPANY_GOALS.workshop:
        return t("options.goal.workshop");
      case COMPANY_GOALS.longTerm:
        return t("options.goal.longTerm");
      case COMPANY_GOALS.individualSupport:
        return t("options.goal.individualSupport");
      case COMPANY_GOALS.needsAssessment:
        return t("options.goal.needsAssessment");
      case COMPANY_TOPICS.burnout:
        return t("options.topic.burnout");
      case COMPANY_TOPICS.stress:
        return t("options.topic.stress");
      case COMPANY_TOPICS.communication:
        return t("options.topic.communication");
      case COMPANY_TOPICS.leadership:
        return t("options.topic.leadership");
      case COMPANY_TOPICS.mentalHealth:
        return t("options.topic.mentalHealth");
      case COMPANY_TOPICS.psychSafety:
        return t("options.topic.psychSafety");
      case COMPANY_FORMATS.online:
        return t("options.format.online");
      case COMPANY_FORMATS.inPerson:
        return t("options.format.inPerson");
      case COMPANY_FORMATS.combined:
        return t("options.format.combined");
      case COMPANY_FORMATS.unsure:
        return t("options.format.unsure");
      default:
        return option;
    }
  };

  const modelCopy = (slug: string) => {
    switch (slug) {
      case "lecture-custom":
        return {
          name: t("models.lecture.name"),
          description: t("models.lecture.description"),
        };
      case "team-workshop":
        return {
          name: t("models.workshop.name"),
          description: t("models.workshop.description"),
        };
      case "employee-support-program":
        return {
          name: t("models.support.name"),
          description: t("models.support.description"),
        };
      case "flexible-fund":
        return {
          name: t("models.flexible.name"),
          description: t("models.flexible.description"),
        };
      case "needs-assessment":
        return {
          name: t("models.assessment.name"),
          description: t("models.assessment.description"),
        };
      default:
        return {
          name: t("models.custom.name"),
          description: t("models.custom.description"),
        };
    }
  };

  return { t, planTitle, optionLabel, modelCopy };
}
