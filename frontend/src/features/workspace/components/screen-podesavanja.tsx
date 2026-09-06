"use client";

import { useTranslations } from "next-intl";

import { EmptyDashedCard } from "@/components/panel/empty-dashed-card";

import { LanguageSettingsSection } from "./language-settings-section";
import { PageHeader } from "./page-header";

/** Podešavanja — language settings, plus the sections still in preparation. */
export function ScreenPodesavanja() {
  const t = useTranslations("workspace");

  const upcoming = [
    { key: "locations" },
    { key: "notifications" },
    { key: "centre" },
  ] as const;

  return (
    <section className="animate-fade-up">
      <PageHeader
        title={t("settings.page.title")}
        description={t("settings.page.description")}
      />

      <div className="mb-6">
        <LanguageSettingsSection />
      </div>

      <div className="grid grid-cols-1 gap-3.5 lg:grid-cols-2">
        {upcoming.map((item) => (
          <EmptyDashedCard
            key={item.key}
            title={t(`settings.page.${item.key}.title`)}
            soon
          >
            {t(`settings.page.${item.key}.body`)}
          </EmptyDashedCard>
        ))}
      </div>
    </section>
  );
}
