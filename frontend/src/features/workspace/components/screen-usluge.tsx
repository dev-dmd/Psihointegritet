import { StatusBadge } from "@/components/panel/status-badge";
import { Chip } from "@/components/ui/chip";

import { serviceCatalog } from "../data";
import { STATUS_META } from "../types";
import { PageHeader } from "./page-header";

/** Usluge i cene — service catalog with internal codes, variants, rules. */
export function ScreenUsluge() {
  return (
    <section className="animate-fade-up">
      <PageHeader
        title="Usluge i cene"
        description="Centralni katalog iz kojeg Booking i Matching engine čitaju podatke."
      />
      <div className="grid grid-cols-1 gap-3.5 lg:grid-cols-2">
        {serviceCatalog.map((service) => {
          const meta = STATUS_META[service.status];
          return (
            <div
              key={service.code}
              className="rounded-card border-line bg-surface border px-6 py-5"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-coffee font-serif text-[20px]">
                    {service.name}
                  </div>
                  <div className="text-ink-45 mt-0.5 font-mono text-[11.5px]">
                    {service.code}
                  </div>
                </div>
                <StatusBadge tone={meta.tone}>{meta.label}</StatusBadge>
              </div>
              <div className="text-ink-55 mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[13px]">
                <span>{service.duration}</span>
                <span className="text-coffee font-semibold">
                  {service.price}
                </span>
                <span>{service.format}</span>
              </div>
              <div className="text-ink-55 mt-1 text-[12.5px]">
                Terapeuti: {service.therapists}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {service.variants.map((variant) => (
                  <Chip key={variant} variant="tag" className="text-[12px]">
                    {variant}
                  </Chip>
                ))}
              </div>
              <div className="border-line text-ink-55 mt-3.5 flex flex-wrap gap-x-4 gap-y-1 border-t pt-3 text-[12px]">
                <span>Ručna potvrda: {service.manual}</span>
                <span>Buffer: {service.buffer}</span>
                <span>Otkazivanje: {service.cancel}</span>
              </div>
            </div>
          );
        })}
      </div>
      <p className="text-ink-45 mt-4 text-[12.5px] italic">
        Cene su okvirne i prate katalog sa javnog sajta. Izmena kataloga stiže
        sa Booking engine-om.
      </p>
    </section>
  );
}
