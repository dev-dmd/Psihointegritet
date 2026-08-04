"use client";

import { StatCard } from "@/components/panel/stat-card";

import {
  type CompassFlowDefinition,
  type CompassFlowVersion,
} from "../../compass-flow-api";
import { useCompassFlowAdmin } from "../../hooks/use-compass-flow-admin";
import { useTaxonomyRegistryQuery } from "../../hooks/use-taxonomy-registry";
import { CompassContentWorkspace } from "./compass-content-workspace";

export type CompassWorkspaceSection =
  "overview" | "flow" | "content" | "results" | "testing" | "publishing";

function initialDefinition(): CompassFlowDefinition {
  return {
    schemaVersion: 1,
    entryQuestionId: "area",
    questions: [
      {
        questionId: "area",
        prompt: "Od čega želite da počnete?",
        helpText: "Izaberite oblast koja vam je najbliža.",
        selectionTarget: "topic_group",
        inputMode: "single_select",
        optionSource: "taxonomy_axis",
        taxonomyAxis: "topic_group",
        allowedTermIds: [],
        filterTopicsBySelectedArea: false,
        maxSelections: 1,
        optional: true,
        defaultNextQuestionId: null,
        skipNextQuestionId: null,
        staticOptions: [],
        terminal: "results",
      },
    ],
    resultSections: [
      {
        sectionId: "professional-support",
        title: "Stručna podrška",
        goalIds: [],
        maxItems: 1,
        emptyBehavior: "show",
        locked: true,
      },
    ],
  };
}

function nextTarget(status: CompassFlowVersion["status"]) {
  if (status === "draft") return "in_review";
  if (status === "in_review") return "approved";
  if (status === "approved") return "published";
  if (status === "published") return "archived";
  return null;
}

export function CompassAdminWorkspace({
  section,
}: {
  section: CompassWorkspaceSection;
}) {
  const registry = useTaxonomyRegistryQuery();
  const {
    flows,
    createMutation,
    saveMutation,
    transitionMutation,
    reviewMutation,
    previewMutation,
  } = useCompassFlowAdmin(initialDefinition);
  const active = flows.data?.[0];

  const managed =
    registry.data?.terms.filter((term) => !term.systemDefined) ?? [];
  const areas = managed.filter(
    (term) => term.axis === "topic_group" && term.status === "published",
  );
  const topics = managed.filter(
    (term) => term.axis === "topic" && term.status === "published",
  );

  if (flows.isLoading || registry.isLoading)
    return <p>Učitavanje Kompas radnog prostora…</p>;
  if (flows.isError)
    // The server already says *why* (missing tenant, unprovisioned account, no
    // active role). Swallowing it left the operator guessing between three
    // different fixes.
    return (
      <div className="border-danger/45 bg-danger/8 rounded-panel border px-5 py-4">
        <p className="text-coffee text-[14.5px] font-semibold">
          Flow verzije se trenutno ne mogu učitati
        </p>
        <p className="text-ink-70 mt-1 text-[13px] leading-[1.5]">
          {flows.error instanceof Error
            ? flows.error.message
            : "Osvežite stranicu; ako se ponovi, javite tehničkom timu."}
        </p>
      </div>
    );

  if (section === "overview") {
    const checks = [
      { label: "Objavljena oblast", ok: areas.length > 0 },
      { label: "Objavljena tema", ok: topics.length > 0 },
      { label: "Objavljena flow verzija", ok: active?.status === "published" },
      {
        label: "Povezan CMS sadržaj",
        ok: false,
        note: "Proverava se u kartici Sadržaj",
      },
    ];
    return (
      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard value={String(areas.length)} label="Objavljene oblasti" />
          <StatCard value={String(topics.length)} label="Objavljene teme" />
          <StatCard
            value={String(flows.data?.length ?? 0)}
            label="Flow verzije"
          />
          <StatCard value={active?.status ?? "—"} label="Aktuelni status" />
        </div>
        <div className="rounded-panel border-line bg-surface border px-6 py-5">
          <h2 className="text-forest font-serif text-[21px]">
            Spremnost za testiranje i objavu
          </h2>
          <ul className="mt-4 space-y-2">
            {checks.map((check) => (
              <li
                key={check.label}
                className="flex items-center gap-3 text-[13.5px]"
              >
                <span
                  className={check.ok ? "text-badge-ok" : "text-badge-amber"}
                >
                  {check.ok ? "✓" : "○"}
                </span>
                {check.label}
                {check.note ? ` — ${check.note}` : ""}
              </li>
            ))}
          </ul>
        </div>
      </div>
    );
  }

  if (!active) {
    return (
      <div className="rounded-panel border-line bg-surface border px-6 py-8 text-center">
        <h2 className="text-forest font-serif text-[21px]">
          Tok pitanja još nije kreiran
        </h2>
        <p className="text-ink-55 mt-2 text-[13.5px]">
          Početni draft sadrži jedno opciono DB-backed pitanje i zaključanu
          stručnu podršku.
        </p>
        <button
          type="button"
          onClick={() => createMutation.mutate()}
          disabled={createMutation.isPending}
          className="bg-forest text-canvas mt-5 min-h-11 rounded-full px-5 font-semibold"
        >
          Kreiraj početni draft
        </button>
      </div>
    );
  }

  if (section === "flow") {
    return (
      <div className="space-y-4">
        {active.definition.questions.map((question, index) => (
          <article
            key={question.questionId}
            className="rounded-panel border-line bg-surface border px-6 py-5"
          >
            <p className="text-sage text-[11px] font-semibold uppercase">
              Pitanje {index + 1}
            </p>
            <label className="text-ink-55 mt-3 block text-[12px]">
              Prompt
              <input
                defaultValue={question.prompt}
                disabled={active.status !== "draft"}
                onBlur={(event) => {
                  const questions = active.definition.questions.map((item) =>
                    item.questionId === question.questionId
                      ? { ...item, prompt: event.target.value }
                      : item,
                  );
                  saveMutation.mutate({
                    flow: active,
                    definition: { ...active.definition, questions },
                  });
                }}
                className="border-line-strong mt-1 min-h-11 w-full rounded-lg border px-3"
              />
            </label>
            <dl className="text-ink-55 mt-4 grid gap-2 text-[12.5px] sm:grid-cols-2">
              <div>
                <dt>Tip odgovora</dt>
                <dd className="text-coffee font-semibold">
                  {question.inputMode}
                </dd>
              </div>
              <div>
                <dt>Izvor opcija</dt>
                <dd className="text-coffee font-semibold">
                  {question.optionSource}
                </dd>
              </div>
              <div>
                <dt>Šta odgovor popunjava</dt>
                <dd className="text-coffee font-semibold">
                  {question.selectionTarget}
                </dd>
              </div>
              <div>
                <dt>Posle ovog odgovora</dt>
                <dd className="text-coffee font-semibold">
                  {question.defaultNextQuestionId ??
                    question.terminal ??
                    "Polazni paket"}
                </dd>
              </div>
            </dl>
            <details className="mt-4 text-[12px]">
              <summary>Tehnički detalji</summary>
              <code>{question.questionId}</code>
            </details>
          </article>
        ))}
      </div>
    );
  }

  if (section === "content") {
    return <CompassContentWorkspace />;
  }

  if (section === "results") {
    return (
      <div className="space-y-3">
        {active.definition.resultSections.map((result, index) => (
          <div
            key={result.sectionId}
            className="rounded-panel border-line bg-surface flex items-center justify-between gap-4 border px-5 py-4"
          >
            <div>
              <p className="text-forest font-semibold">
                {index + 1}. {result.title}
              </p>
              <p className="text-ink-55 mt-1 text-[12px]">
                Ciljevi:{" "}
                {result.goalIds?.join(", ") || "sistemska/izvedena sekcija"} ·
                najviše {result.maxItems}
              </p>
            </div>
            {result.locked ? (
              <span className="bg-badge-soft-bg text-badge-soft rounded-full px-3 py-1 text-[11px]">
                Zaključana sistemska sekcija
              </span>
            ) : null}
          </div>
        ))}
      </div>
    );
  }

  if (section === "testing") {
    const preview = previewMutation.data;
    return (
      <div className="rounded-panel border-line bg-surface border px-6 py-6">
        <h2 className="text-forest font-serif text-[21px]">Scenario builder</h2>
        <p className="text-ink-55 mt-2 text-[13px]">
          Preskok koristi tačnu draft verziju i isti backend Engine kao javni
          tok.
        </p>
        <button
          type="button"
          onClick={() => previewMutation.mutate(active)}
          className="bg-forest text-canvas mt-4 min-h-11 rounded-full px-5 font-semibold"
        >
          Testiraj polazni paket
        </button>
        {preview ? (
          <pre className="bg-canvas mt-5 overflow-auto rounded-lg p-4 text-[11px]">
            {JSON.stringify(
              {
                selection: preview.selection,
                sections: preview.experience.sections.map((item) => ({
                  id: item.sectionId,
                  cards: item.contentItems.length,
                })),
              },
              null,
              2,
            )}
          </pre>
        ) : null}
        {previewMutation.isError ? (
          <p className="text-danger mt-3">{previewMutation.error.message}</p>
        ) : null}
      </div>
    );
  }

  const target = nextTarget(active.status);
  return (
    <div className="rounded-panel border-line bg-surface border px-6 py-6">
      <h2 className="text-forest font-serif text-[21px]">
        Pregled i objavljivanje
      </h2>
      <p className="mt-2 text-[13.5px]">
        Verzija {active.version} · status <strong>{active.status}</strong>
      </p>
      <p className="text-ink-55 mt-2 text-[12.5px]">
        Validacija grafa i taxonomy referenci ponavlja se na backendu pri svakoj
        governance tranziciji.
      </p>
      {active.status === "in_review" ? (
        <div className="mt-5 flex gap-3">
          <button
            type="button"
            onClick={() =>
              reviewMutation.mutate({ flow: active, capability: "clinical" })
            }
            className="border-line-strong min-h-11 rounded-full border px-4"
          >
            Odobri stručno
          </button>
          <button
            type="button"
            onClick={() =>
              reviewMutation.mutate({ flow: active, capability: "business" })
            }
            className="border-line-strong min-h-11 rounded-full border px-4"
          >
            Odobri poslovno
          </button>
        </div>
      ) : null}
      {target ? (
        <button
          type="button"
          onClick={() => transitionMutation.mutate({ flow: active, target })}
          className="bg-forest text-canvas mt-5 min-h-11 rounded-full px-5 font-semibold"
        >
          {target === "in_review"
            ? "Pošalji na pregled"
            : target === "approved"
              ? "Potvrdi odobrenja"
              : target === "published"
                ? "Objavi verziju"
                : "Arhiviraj verziju"}
        </button>
      ) : null}
      {transitionMutation.isError || reviewMutation.isError ? (
        <p className="text-danger mt-3">
          {(transitionMutation.error ?? reviewMutation.error)?.message}
        </p>
      ) : null}
      <details className="mt-6 text-[12px]">
        <summary>Tehnički detalji</summary>
        <p>Flow {active.flowId}</p>
        <p>Verzija {active.versionId}</p>
        <p>Optimistic lock {active.lockVersion}</p>
      </details>
    </div>
  );
}
