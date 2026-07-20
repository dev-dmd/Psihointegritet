"use client";

import { useState } from "react";
import { toast } from "sonner";

import { StatusBadge } from "@/components/panel/status-badge";
import { TabPills } from "@/components/panel/tab-pills";
import { Chip } from "@/components/ui/chip";

import { clients, unassignedRequests } from "../data";
import { STATUS_META } from "../types";
import { useWorkspace } from "../workspace-context";
import { PageHeader } from "./page-header";

export function ScreenKlijenti() {
  const [tab, setTab] = useState("svi");
  const { selectedTherapistSlug } = useWorkspace();

  const shownClients = selectedTherapistSlug
    ? clients.filter((c) => c.therapistSlug === selectedTherapistSlug)
    : clients;

  const tabs = [
    { id: "svi", label: "Svi" },
    { id: "nedodeljeni", label: `Nedodeljeni · ${unassignedRequests.length}` },
  ];

  return (
    <section className="animate-fade-up">
      <PageHeader
        title="Klijenti"
        description="Aktivan rad, dodele i Intake zahtevi bez terapeuta."
      />
      <TabPills tabs={tabs} activeId={tab} onChange={setTab} className="mb-5" />

      {tab === "svi" ? (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {shownClients.map((client) => {
            const meta = STATUS_META[client.status];
            return (
              <div
                key={client.id}
                className="rounded-card border-line bg-surface border px-5 py-[18px]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3.5">
                    <span className="bg-meadow/35 text-forest inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[13px] font-semibold">
                      {client.initials}
                    </span>
                    <div>
                      <div className="text-coffee text-[15px] font-semibold">
                        {client.name}
                      </div>
                      <div className="text-ink-55 text-[12.5px]">
                        {client.therapist}
                      </div>
                    </div>
                  </div>
                  <StatusBadge tone={meta.tone}>{meta.label}</StatusBadge>
                </div>
                <div className="border-line text-ink-55 mt-3.5 flex flex-wrap gap-x-4 gap-y-1 border-t pt-3 text-[12.5px]">
                  <span>Sledeći: {client.next}</span>
                  <span>
                    {client.format} · {client.service}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      ) : null}

      {tab === "nedodeljeni" ? (
        <div className="flex flex-col gap-3">
          <div className="bg-meadow/22 border-sage/30 text-coffee rounded-tile border px-5 py-3.5 text-[13px] leading-[1.5]">
            Deo Intake &amp; Matching engine-a — zahtevi kojima sistem nije
            automatski dodelio terapeuta. Kada terapeut preuzme klijenta,
            ostalima je vidljivo samo ko ga je preuzeo.
          </div>
          {unassignedRequests.map((request) => (
            <div
              key={request.id}
              className="rounded-card border-line bg-surface border px-6 py-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-center gap-3.5">
                  <span className="bg-warm/30 text-coffee inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[13px] font-semibold">
                    {request.initials}
                  </span>
                  <div>
                    <div className="text-coffee text-[15px] font-semibold">
                      Intake zahtev · {request.date}
                    </div>
                    <div className="text-ink-55 text-[12.5px]">
                      {request.ago} · {request.format} · uzrast{" "}
                      {request.ageGroup}
                    </div>
                  </div>
                </div>
                <StatusBadge tone="wait">Nedodeljen</StatusBadge>
              </div>
              <div className="mt-3.5 flex flex-wrap gap-2">
                {request.areas.map((area) => (
                  <Chip
                    key={area}
                    variant="tagOutlined"
                    className="text-[12.5px]"
                  >
                    {area}
                  </Chip>
                ))}
              </div>
              <div className="text-ink-55 mt-3 text-[13px]">
                <span className="font-semibold">Preporuka:</span>{" "}
                {request.recommended} — {request.reason}
              </div>
              <div className="mt-4 flex flex-wrap gap-2.5">
                <button
                  type="button"
                  onClick={() =>
                    toast.success(
                      "Preuzeto — ostalima je vidljivo samo ko je preuzeo.",
                    )
                  }
                  className="bg-forest text-canvas hover:bg-forest-hover cursor-pointer rounded-full border-0 px-5 py-2.5 text-[13px] font-semibold transition-colors"
                >
                  Preuzmi
                </button>
                <button
                  type="button"
                  onClick={() =>
                    toast("Dodela terapeutu stiže sa Booking engine-om.")
                  }
                  className="border-coffee/22 text-coffee hover:border-sage cursor-pointer rounded-full border-[1.5px] bg-transparent px-5 py-2.5 text-[13px] font-semibold transition-colors"
                >
                  Dodeli terapeutu
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}
