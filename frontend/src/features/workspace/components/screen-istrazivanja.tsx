"use client";

import { useState } from "react";

import { ProgressBar } from "@/components/panel/progress-bar";
import { StatCard } from "@/components/panel/stat-card";
import { TabPills } from "@/components/panel/tab-pills";

import { useResearchOverviewQuery } from "../hooks/use-research-results";
import type { SurveyResults } from "../research-api";
import { PageHeader } from "./page-header";

const SURVEY_TABS = [
  { id: "overview", label: "Pregled" },
  { id: "online-experience", label: "Iskustvo online podrške" },
  { id: "compass-experience", label: "Iskustvo Kompasa" },
] as const;

type TabId = (typeof SURVEY_TABS)[number]["id"];

const DATE_FORMATTER = new Intl.DateTimeFormat("sr-Latn-RS", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

function formatPeriod(survey: SurveyResults): string {
  if (!survey.firstSubmissionAt || !survey.lastSubmissionAt) {
    return "još nema odgovora";
  }
  const from = DATE_FORMATTER.format(new Date(survey.firstSubmissionAt));
  const to = DATE_FORMATTER.format(new Date(survey.lastSubmissionAt));
  return from === to ? from : `${from} – ${to}`;
}

function SurveyCard({ survey }: { survey: SurveyResults }) {
  return (
    <article className="rounded-panel border-line bg-surface border px-6 py-6">
      <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-forest font-serif text-[21px] font-normal">
          {survey.title}
        </h3>
        <span className="text-ink-55 text-[12.5px]">
          verzija {survey.version} · {survey.status} · {survey.submissionCount}{" "}
          odgovora · {formatPeriod(survey)}
        </span>
      </div>

      {survey.submissionCount === 0 ? (
        <p className="text-ink-55 mt-4 text-[13px]">
          Za ovu verziju još nema odgovora.
        </p>
      ) : (
        <>
          <div className="text-ink-45 mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11.5px]">
            {Object.entries(survey.surfaces).map(([surface, count]) => (
              <span key={surface}>
                izvor {surface}: {count}
              </span>
            ))}
            {Object.entries(survey.triggers).map(([trigger, count]) => (
              <span key={trigger}>
                okidač {trigger}: {count}
              </span>
            ))}
          </div>

          <div className="mt-5 flex flex-col gap-6">
            {survey.questions.map((question) => {
              // Percentages are of this version's submissions only — never of
              // a total that merges versions or surveys.
              const total = survey.submissionCount;
              return (
                <div key={question.questionId}>
                  <div className="text-coffee mb-2.5 text-[13.5px] font-semibold">
                    {question.prompt}
                  </div>
                  <div className="flex flex-col gap-2.5">
                    {question.options.map((option) => {
                      const pct =
                        total > 0
                          ? Math.round((option.count / total) * 100)
                          : 0;
                      return (
                        <div key={option.optionId}>
                          <div className="text-ink-55 mb-1 flex justify-between text-[12.5px]">
                            <span>{option.label}</span>
                            <span>
                              {option.count} · {pct}%
                            </span>
                          </div>
                          <ProgressBar value={pct} />
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </article>
  );
}

/**
 * Istraživanja — anonymous survey results, admin only.
 *
 * One route, one read, three tabs. Results are never merged across surveys or
 * across versions of the same survey: a changed question set is a different
 * measurement, and averaging the two would report a number nobody measured.
 */
export function ScreenIstrazivanja() {
  const [tab, setTab] = useState<TabId>("overview");
  const query = useResearchOverviewQuery();
  const surveys = query.data ?? [];

  const shown =
    tab === "overview"
      ? surveys
      : surveys.filter((survey) => survey.stableId === tab);

  const totalSubmissions = surveys.reduce(
    (sum, survey) => sum + survey.submissionCount,
    0,
  );

  return (
    <section className="animate-fade-up">
      <PageHeader
        title="Istraživanja"
        description="Anonimni odgovori sa javnog sajta — bez ličnih podataka ispitanika."
      />

      <TabPills
        tabs={[...SURVEY_TABS]}
        activeId={tab}
        onChange={(id) => setTab(id as TabId)}
        className="mb-5"
      />

      {tab === "overview" ? (
        <div className="mb-5 grid grid-cols-2 gap-3.5 lg:grid-cols-3">
          <StatCard value={String(surveys.length)} label="Verzija anketa" />
          <StatCard value={String(totalSubmissions)} label="Ukupno odgovora" />
          <StatCard
            value={String(
              new Set(surveys.map((survey) => survey.stableId)).size,
            )}
            label="Anketa"
          />
        </div>
      ) : null}

      {query.isLoading ? (
        <p className="text-ink-55 text-[13.5px]">Učitavanje rezultata…</p>
      ) : null}

      {query.isError ? (
        <div className="border-danger/45 bg-danger/8 rounded-panel border px-5 py-4">
          <p className="text-coffee text-[14.5px] font-semibold">
            Rezultati se ne mogu učitati
          </p>
          <p className="text-ink-70 mt-1 text-[13px]">
            Osvežite stranicu ili pokušajte kasnije.
          </p>
        </div>
      ) : null}

      {!query.isLoading && !query.isError && shown.length === 0 ? (
        <p className="border-line-strong rounded-panel text-ink-55 border border-dashed px-6 py-10 text-center text-[13.5px]">
          Za ovu anketu još nema objavljene verzije.
        </p>
      ) : null}

      <div className="flex flex-col gap-4">
        {shown.map((survey) => (
          <SurveyCard
            key={`${survey.stableId}:${survey.version}`}
            survey={survey}
          />
        ))}
      </div>

      <p className="text-ink-45 mt-4 text-[12.5px] italic">
        Odgovori su anonimni i ne vezuju se za naloge. Rezultati se ne spajaju
        između anketa ni između verzija iste ankete.
      </p>
    </section>
  );
}
