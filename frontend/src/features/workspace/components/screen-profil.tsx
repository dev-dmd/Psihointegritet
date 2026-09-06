"use client";

import { useTranslations } from "next-intl";

import Image from "next/image";
import { useState } from "react";

import { KV } from "@/components/panel/kv";
import { TabPills } from "@/components/panel/tab-pills";
import { Toggle } from "@/components/panel/toggle";
import { Chip } from "@/components/ui/chip";
import { formatRsd } from "@/content/services";
import { useFallbackContent } from "@/content/use-content";

import { MARIA } from "../demo-slugs";
import { AvailabilityOverviewCards } from "./availability/availability-overview-cards";
import { LockIcon } from "./icons";
import { PageHeader } from "./page-header";
import { WorkspaceDataNotice } from "./workspace-data-notice";

// Stable codes — query values are never translated (D-077 Amendment §2).
export function ScreenProfil() {
  const t = useTranslations("screens.profile");
  const tabs = [
    { id: "public", label: t("tabs.public") },
    { id: "matching", label: t("tabs.matching") },
    { id: "availability", label: t("tabs.availability") },
  ];
  const [tab, setTab] = useState("public");
  const fallback = useFallbackContent();
  const { matchingPreferences } = fallback.workspaceDemo;
  const serviceCatalog = fallback.services.serviceCatalog;
  const therapist = fallback.therapists.find((item) => item.slug === MARIA);

  if (!therapist) {
    return (
      <section className="animate-fade-up">
        <PageHeader title={t("title")} description={t("description")} />
        <WorkspaceDataNotice />
      </section>
    );
  }

  const publicServices = [
    ...serviceCatalog
      .filter((service) => therapist.bookingServiceSlugs.includes(service.slug))
      .map((service) => ({
        title: service.name,
        duration: service.duration,
        price: formatRsd(service.priceAmount),
      })),
    ...therapist.additionalServices,
  ];

  return (
    <section className="animate-fade-up">
      <PageHeader title={t("title")} description={t("description")} />
      <WorkspaceDataNotice />
      <TabPills tabs={tabs} activeId={tab} onChange={setTab} className="mb-5" />

      {tab === "public" ? (
        <div className="grid grid-cols-1 gap-3.5 lg:grid-cols-2">
          <div className="rounded-card border-line bg-surface border px-6 py-6">
            <div className="mb-4 flex items-center gap-4">
              <Image
                src={therapist.image}
                alt={therapist.name}
                width={60}
                height={60}
                className="border-meadow/55 h-[60px] w-[60px] rounded-full border-2 object-cover"
              />
              <div>
                <div className="text-coffee font-serif text-[20px]">
                  {therapist.name}
                </div>
                <div className="text-ink-55 text-[12.5px]">
                  {therapist.title}
                </div>
              </div>
            </div>
            <p className="text-coffee/85 mb-4 font-serif text-[17px] leading-[1.5] italic">
              {`„${therapist.quote}“`}
            </p>
            <div className="grid grid-cols-2 gap-3.5">
              <KV label={t("cityAndFormat")}>
                {therapist.city}, {therapist.cityRegionCode} · {t("online")}
              </KV>
              <KV label={t("formats")}>{therapist.formats}</KV>
            </div>
          </div>
          <div className="rounded-card border-line bg-surface border px-6 py-6">
            <div className="text-sage mb-3 text-[11.5px] font-semibold tracking-[0.14em] uppercase">
              {t("publicAreas")}
            </div>
            <div className="mb-5 flex flex-wrap gap-2">
              {therapist.areas.map((area) => (
                <Chip key={area} variant="tagOutlined" className="text-[13px]">
                  {area}
                </Chip>
              ))}
            </div>
            <div className="text-sage mb-2.5 text-[11.5px] font-semibold tracking-[0.14em] uppercase">
              {t("services")}
            </div>
            <div className="flex flex-col gap-1.5">
              {publicServices.map((service) => (
                <div
                  key={service.title}
                  className="text-coffee/80 text-[13.5px]"
                >
                  {service.title}
                  {service.duration ? ` · ${service.duration}` : ""}
                  {service.price ? ` · ${service.price}` : ""}
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {tab === "matching" ? (
        <div className="flex flex-col gap-3.5">
          <div className="bg-warm/16 border-warm/45 rounded-tile text-coffee flex items-center gap-2.5 border px-4 py-3 text-[13px]">
            <LockIcon />
            <span>
              <span className="font-bold">{t("internalLabel")}</span>{" "}
              {t("internalNote")}
            </span>
          </div>
          <div className="grid grid-cols-1 gap-3.5 lg:grid-cols-2">
            <div className="rounded-card border-line bg-surface border px-6 py-6">
              <div className="text-sage mb-3.5 text-[11.5px] font-semibold tracking-[0.14em] uppercase">
                {t("acceptsHeading")}
              </div>
              <div className="grid grid-cols-2 gap-3.5">
                <KV label={t("ageGroups")}>{matchingPreferences.ageGroups}</KV>
                <KV label={t("maxNewMonthly")} serif>
                  {matchingPreferences.maxNewMonthly}
                </KV>
                <KV label={t("recommendationPriority")}>
                  {matchingPreferences.priority}
                </KV>
                <KV label={t("cities")}>{matchingPreferences.cities}</KV>
              </div>
              <div className="border-line mt-4 border-t pt-3.5">
                <div className="text-ink-45 mb-2 text-[11px] font-semibold tracking-[0.12em] uppercase">
                  {t("notAccepting")}
                </div>
                <div className="flex flex-wrap gap-2">
                  {matchingPreferences.notAccepting.map((item) => (
                    <span
                      key={item}
                      className="text-badge-wait bg-warm/20 border-warm/45 rounded-full border px-3 py-1 text-[12.5px] font-medium"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            <div className="rounded-card border-line bg-surface border px-6 py-6">
              <div className="text-sage mb-2 text-[11.5px] font-semibold tracking-[0.14em] uppercase">
                {t("formatAvailability")}
              </div>
              <div className="flex flex-col">
                {matchingPreferences.toggles.map((toggle) => (
                  <div
                    key={toggle.label}
                    className="border-line flex items-center justify-between gap-3 border-b py-3 last:border-b-0"
                  >
                    <span className="text-coffee text-sm font-semibold">
                      {toggle.label}
                    </span>
                    <Toggle
                      checked={toggle.on}
                      disabled
                      label={toggle.label}
                      onChange={() => undefined}
                    />
                  </div>
                ))}
                <div className="flex items-center justify-between gap-3 py-3">
                  <span className="text-coffee text-sm font-semibold">
                    {t("onlineOrInPerson")}
                  </span>
                  <span className="text-ink-55 text-[13.5px] font-semibold">
                    {matchingPreferences.formatNote}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {tab === "availability" ? <AvailabilityOverviewCards /> : null}
    </section>
  );
}
