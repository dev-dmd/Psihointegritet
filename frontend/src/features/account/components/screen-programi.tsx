"use client";

import { useTranslations } from "next-intl";

import { EmptyDashedCard } from "@/components/panel/empty-dashed-card";

/**
 * KP 03 „Programi i paketi".
 *
 * The design fills this screen with a six-module online program and a
 * five-session package. Neither exists anywhere in the system — no table, no
 * endpoint, no admin screen that could create one — so the screen states that
 * plainly instead of rendering a progress bar over invented numbers. It keeps
 * its place in the navigation because the tab is part of the agreed panel
 * shape, and an empty room is honest in a way a furnished mock-up is not.
 */
export function ScreenProgrami() {
  const t = useTranslations("account.programs");

  return (
    <section className="animate-fade-up flex flex-col gap-3.5">
      <h1 className="text-forest font-serif text-[28px] font-normal">
        {t("title")}
      </h1>
      <EmptyDashedCard title={t("emptyTitle")} soon>
        {t("emptyNote")}
      </EmptyDashedCard>
    </section>
  );
}
