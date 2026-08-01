import Image from "next/image";

import { ProgressBar } from "@/components/panel/progress-bar";
import { StatusBadge } from "@/components/panel/status-badge";

import { therapistCards } from "../data";
import { PageHeader } from "./page-header";

/** Terapeuti — team cards with load and „prima nove" status (admin only). */
export function ScreenTerapeuti() {
  return (
    <section className="animate-fade-up">
      <PageHeader
        title="Terapeuti"
        description="Tim, popunjenost i dostupnost za nove klijente."
      />
      <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2 lg:grid-cols-3">
        {therapistCards.map((therapist) => (
          <div
            key={therapist.slug}
            className="rounded-card border-line bg-surface border px-6 py-6"
          >
            <div className="flex items-center gap-3.5">
              <Image
                src={therapist.image}
                alt={therapist.name}
                width={52}
                height={52}
                className="border-meadow/55 h-[52px] w-[52px] rounded-full border-2 object-cover"
              />
              <div className="min-w-0">
                <div className="text-coffee font-serif text-[18px] leading-tight">
                  {therapist.name}
                </div>
                <div className="text-ink-55 mt-0.5 truncate text-[12px]">
                  {therapist.badge}
                </div>
              </div>
            </div>
            <div className="mt-4">
              <div className="text-ink-55 mb-1.5 flex justify-between text-[12.5px]">
                <span>{therapist.clients} klijenata</span>
                <span>Popunjenost {therapist.occupancy}%</span>
              </div>
              <ProgressBar value={therapist.occupancy} />
            </div>
            <div className="mt-4">
              <StatusBadge tone={therapist.acceptingNew ? "ok" : "wait"}>
                {therapist.acceptingNew
                  ? "Prima nove klijente"
                  : "Ne prima nove"}
              </StatusBadge>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
