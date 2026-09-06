"use client";

import { EmptyDashedCard } from "@/components/panel/empty-dashed-card";
import { useTranslations } from "next-intl";

import { PageHeader } from "./page-header";

/** Shared „U pripremi" screen for billing / audit-log / settings routes. */
export function ComingSoonSection() {
  const t = useTranslations("superadmin");
  return (
    <section className="animate-fade-up">
      <PageHeader
        title={t("comingSoon.title")}
        description={t("comingSoon.description")}
      />
      <div className="grid grid-cols-1 gap-3.5 lg:grid-cols-2">
        <EmptyDashedCard title={t("comingSoon.billing.title")}>
          {t("comingSoon.billing.body")}
        </EmptyDashedCard>
        <EmptyDashedCard title={t("comingSoon.auditLog.title")}>
          {t("comingSoon.auditLog.body")}
        </EmptyDashedCard>
      </div>
    </section>
  );
}
