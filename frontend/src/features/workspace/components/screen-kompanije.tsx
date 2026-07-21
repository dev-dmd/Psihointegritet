import { ProgressBar } from "@/components/panel/progress-bar";
import { StatusBadge } from "@/components/panel/status-badge";

import { companies, companyPipeline } from "../data";
import { STATUS_META } from "../types";
import { PageHeader } from "./page-header";

/** Kompanije — B2B pipeline + fund cards (admin only). */
export function ScreenKompanije() {
  return (
    <section className="animate-fade-up">
      <PageHeader
        title="Kompanije"
        description="Kompanijski programi, fondovi termina i tok saradnje."
      />
      <div className="mb-5 flex flex-wrap gap-2">
        {companyPipeline.map((stage, index) => (
          <span
            key={stage}
            className="text-ink-55 inline-flex items-center gap-2 text-[12.5px] font-semibold"
          >
            {index > 0 ? <span className="text-coffee/30">→</span> : null}
            <span className="bg-coffee/6 rounded-full px-3 py-1">{stage}</span>
          </span>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-3.5 lg:grid-cols-2">
        {companies.map((company) => {
          const meta = STATUS_META[company.status];
          const pct = company.bought
            ? Math.round((company.used / company.bought) * 100)
            : 0;
          return (
            <div
              key={company.id}
              className="rounded-card border-line bg-surface border px-6 py-5"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-coffee font-serif text-[20px]">
                    {company.name}
                  </div>
                  <div className="text-ink-55 mt-0.5 text-[12.5px]">
                    {company.contact}
                  </div>
                </div>
                <StatusBadge tone={meta.tone}>{meta.label}</StatusBadge>
              </div>
              <p className="text-ink-55 mt-3 text-[13px] leading-[1.5]">
                {company.goal}
              </p>
              <div className="border-line mt-3.5 border-t pt-3.5">
                <div className="text-ink-55 flex flex-wrap justify-between gap-2 text-[12.5px]">
                  <span>{company.model}</span>
                  <span>
                    {company.employees} zaposlenih · {company.location}
                  </span>
                </div>
                {company.bought ? (
                  <div className="mt-2.5">
                    <div className="text-ink-55 mb-1.5 flex justify-between text-[12px]">
                      <span>
                        {company.used} / {company.bought} termina
                      </span>
                      <span>ističe {company.expires}</span>
                    </div>
                    <ProgressBar value={pct} />
                  </div>
                ) : (
                  <div className="text-ink-45 mt-2 text-[12px] italic">
                    Bez aktivnog fonda — u fazi {meta.label.toLowerCase()}.
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
