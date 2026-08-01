import { ProgressBar } from "@/components/panel/progress-bar";
import { StatCard } from "@/components/panel/stat-card";

import { researchStats, researchSurvey } from "../data";
import { PageHeader } from "./page-header";

/** Istraživanja — survey analytics (admin only), anonymous. */
export function ScreenIstrazivanja() {
  return (
    <section className="animate-fade-up">
      <PageHeader
        title="Istraživanja"
        description="Anonimni odgovori sa javnog sajta — bez ličnih podataka ispitanika."
      />
      <div className="mb-4 grid grid-cols-2 gap-3.5 lg:grid-cols-4">
        {researchStats.map((stat) => (
          <StatCard key={stat.label} value={stat.value} label={stat.label} />
        ))}
      </div>
      <div className="rounded-panel border-line bg-surface border px-6 py-6">
        <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-forest font-serif text-[21px] font-normal">
            {researchSurvey.name}
          </h2>
          <span className="text-ink-55 text-[12.5px]">
            {researchSurvey.responses} odgovora · {researchSurvey.period}
          </span>
        </div>
        <div className="mt-4 flex flex-col gap-6">
          {researchSurvey.questions.map((question) => (
            <div key={question.q}>
              <div className="text-coffee mb-2.5 text-[13.5px] font-semibold">
                {question.q}
              </div>
              <div className="flex flex-col gap-2.5">
                {question.bars.map((bar) => (
                  <div key={bar.label}>
                    <div className="text-ink-55 mb-1 flex justify-between text-[12.5px]">
                      <span>{bar.label}</span>
                      <span>{bar.pct}%</span>
                    </div>
                    <ProgressBar value={bar.pct} />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="border-line mt-6 border-t pt-4">
          <div className="text-ink-45 mb-2 text-[11px] font-semibold tracking-[0.12em] uppercase">
            Otvoreni odgovori
          </div>
          <div className="flex flex-col gap-2">
            {researchSurvey.open.map((quote) => (
              <p
                key={quote}
                className="text-coffee/80 bg-meadow/18 rounded-tile px-4 py-2.5 text-[13px] italic"
              >
                {quote}
              </p>
            ))}
          </div>
        </div>
      </div>
      <p className="text-ink-45 mt-4 text-[12.5px] italic">
        Odgovori su anonimni i ne vezuju se za naloge. Filteri i izvoz stižu u
        Research Analytics fazi.
      </p>
    </section>
  );
}
