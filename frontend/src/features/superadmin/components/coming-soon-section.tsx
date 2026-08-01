import { EmptyDashedCard } from "@/components/panel/empty-dashed-card";

import { PageHeader } from "./page-header";

/** Shared „U pripremi" screen for billing / audit-log / settings routes. */
export function ComingSoonSection() {
  return (
    <section className="animate-fade-up">
      <PageHeader
        title="U pripremi"
        description="Pretplate, Audit Log i Podešavanja postoje kao rute i navigacija — poslovna logika stiže u kasnijim fazama."
      />
      <div className="grid grid-cols-1 gap-3.5 lg:grid-cols-2">
        <EmptyDashedCard title="Pretplate i potrošnja">
          Plan, trial period, obnove, istorija uplata i procenjena mesečna
          potrošnja — read-only sa ručno unetim planom.
        </EmptyDashedCard>
        <EmptyDashedCard title="Audit Log">
          Ko, koja akcija, nad kojim tenantom, prethodna i nova vrednost,
          razlog, vreme — zapisi već nastaju kroz Feature Gates.
        </EmptyDashedCard>
      </div>
    </section>
  );
}
