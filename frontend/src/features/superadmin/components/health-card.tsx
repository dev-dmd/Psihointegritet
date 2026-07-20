import {
  StatusBadge,
  type StatusBadgeTone,
} from "@/components/panel/status-badge";

import { healthServices } from "../data";
import type { ServiceStatus } from "../types";

const SERVICE_STATUS: Record<
  ServiceStatus,
  { label: string; tone: StatusBadgeTone }
> = {
  op: { label: "Operativan", tone: "ok" },
  deg: { label: "Degradiran", tone: "wait" },
  down: { label: "Pao", tone: "danger" },
};

interface HealthCardProps {
  title: string;
  /** Mono „poslednja provera …" note; pass the raw time string. */
  lastCheck: string;
  lastCheckPrefix?: boolean;
}

/** Service health list card (Pregled „Platform Health" / Dijagnostika „Servisi"). */
export function HealthCard({
  title,
  lastCheck,
  lastCheckPrefix,
}: HealthCardProps) {
  return (
    <div className="rounded-panel border-line bg-surface border px-6 pt-[22px] pb-3">
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <h2 className="text-coffee font-serif text-[21px] font-normal">
          {title}
        </h2>
        <span className="text-coffee/50 font-mono text-[11px]">
          {lastCheckPrefix ? `poslednja provera ${lastCheck}` : lastCheck}
        </span>
      </div>
      {healthServices.map((service) => (
        <div
          key={service.name}
          className="border-line grid grid-cols-[1fr_auto_auto] items-center gap-3 border-t px-0.5 py-[11px]"
        >
          <span className="text-coffee text-sm font-semibold">
            {service.name}
          </span>
          <span className="text-coffee/50 font-mono text-[11.5px]">
            {service.meta}
          </span>
          <StatusBadge tone={SERVICE_STATUS[service.status].tone}>
            {SERVICE_STATUS[service.status].label}
          </StatusBadge>
        </div>
      ))}
    </div>
  );
}
