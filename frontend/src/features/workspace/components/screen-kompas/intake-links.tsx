"use client";

import type { FormEvent } from "react";
import { useState } from "react";

import { EmptyDashedCard } from "@/components/panel/empty-dashed-card";
import { cn } from "@/helpers/cn";
import { useUserSafeError } from "@/lib/errors/use-user-safe-error";

import { useCreateTaxonomyIntakeLinkMutation } from "../../hooks/use-taxonomy-registry";
import { type TaxonomyIntakeLink, type TaxonomyTerm } from "../../taxonomy-api";
import { FieldError } from "./governance-error";
import { sortTerms } from "./helpers";
import { IntakeLinkCards } from "./intake-link-cards";

function IntakeLinkCreator({
  terms,
  links,
  onCreated,
}: {
  terms: TaxonomyTerm[];
  links: TaxonomyIntakeLink[];
  onCreated: (link: TaxonomyIntakeLink) => void;
}) {
  const safeError = useUserSafeError();
  const [topicTermId, setTopicTermId] = useState("");
  const [supportAreaTermId, setSupportAreaTermId] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const topics = sortTerms(
    terms.filter((term) => term.axis === "topic" && term.status !== "archived"),
  );
  const supportAreas = sortTerms(
    terms.filter(
      (term) =>
        term.axis === "support_area" &&
        term.systemDefined &&
        term.status !== "archived",
    ),
  );
  const createMutation = useCreateTaxonomyIntakeLinkMutation(
    (link) => {
      onCreated(link);
      setTopicTermId("");
      setSupportAreaTermId("");
    },
    (error) => {
      const presentation = safeError.present(error, "taxonomy", "change");
      const apiFieldErrors = presentation.fieldErrors;
      if (Object.keys(apiFieldErrors).length > 0) {
        setFieldErrors(apiFieldErrors);
        const field = Object.keys(apiFieldErrors)[0];
        const elementId =
          field === "topicTermId"
            ? "kompas-intake-topic"
            : field === "supportAreaTermId"
              ? "kompas-intake-support-area"
              : null;
        if (elementId) {
          requestAnimationFrame(() =>
            document.getElementById(elementId)?.focus({ preventScroll: true }),
          );
        }
        return;
      }
      setServerError(`${presentation.message} ${presentation.nextAction}`);
    },
  );

  const clearFieldError = (field: string) => {
    setServerError(null);
    setFieldErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  };
  const focusLinkField = (id: string) =>
    requestAnimationFrame(() =>
      document.getElementById(id)?.focus({ preventScroll: true }),
    );

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFieldErrors({});
    setServerError(null);
    if (!topicTermId) {
      setFieldErrors({ topicTermId: "Izaberite konkretnu Kompas temu." });
      focusLinkField("kompas-intake-topic");
      return;
    }
    if (!supportAreaTermId) {
      setFieldErrors({ supportAreaTermId: "Izaberite Intake oblast podrške." });
      focusLinkField("kompas-intake-support-area");
      return;
    }
    if (
      links.some(
        (link) =>
          link.topicTermId === topicTermId &&
          link.supportAreaTermId === supportAreaTermId,
      )
    ) {
      setServerError("Ovo povezivanje već postoji u registru.");
      return;
    }
    createMutation.mutate({ topicTermId, supportAreaTermId });
  };

  return (
    <form
      onSubmit={submit}
      className="rounded-panel border-line bg-surface mb-5 border px-5 py-5"
    >
      <h3 className="text-forest font-serif text-[19px]">
        Novo povezivanje ka Intake-u
      </h3>
      <p className="text-ink-55 mt-1 max-w-[760px] text-[12.5px] leading-[1.5]">
        Povezujete konkretnu Kompas temu sa postojećom Intake oblasti podrške.
        Intake oblasti su sistemske i ovde se samo biraju; ne menjaju se niti
        stvaraju kroz Kompas.
      </p>

      {serverError ? (
        <div
          role="alert"
          className="border-danger/45 bg-danger/8 text-ink-70 rounded-tile mt-4 border px-4 py-3 text-[13px] leading-[1.5]"
        >
          {serverError}
        </div>
      ) : null}

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div>
          <label
            htmlFor="kompas-intake-topic"
            className="text-ink-70 mb-1.5 block text-[13px] font-semibold"
          >
            Koju Kompas temu povezujete?
          </label>
          <select
            id="kompas-intake-topic"
            value={topicTermId}
            disabled={createMutation.isPending || topics.length === 0}
            onChange={(event) => {
              setTopicTermId(event.target.value);
              clearFieldError("topicTermId");
            }}
            aria-invalid={Boolean(fieldErrors.topicTermId)}
            aria-describedby={
              fieldErrors.topicTermId ? "kompas-intake-topic-error" : undefined
            }
            className={cn(
              "border-line-strong rounded-tile bg-panel-canvas text-coffee focus:border-sage w-full border px-3.5 py-2.5 text-sm outline-none disabled:opacity-60",
              fieldErrors.topicTermId
                ? "border-danger focus:border-danger"
                : "",
            )}
          >
            <option value="">Izaberite temu</option>
            {topics.map((topic) => (
              <option key={topic.termId} value={topic.termId}>
                {topic.publicLabel}
              </option>
            ))}
          </select>
          <FieldError
            id="kompas-intake-topic-error"
            message={fieldErrors.topicTermId}
          />
        </div>

        <div>
          <label
            htmlFor="kompas-intake-support-area"
            className="text-ink-70 mb-1.5 block text-[13px] font-semibold"
          >
            Kojoj Intake oblasti podrške odgovara?
          </label>
          <select
            id="kompas-intake-support-area"
            value={supportAreaTermId}
            disabled={createMutation.isPending || supportAreas.length === 0}
            onChange={(event) => {
              setSupportAreaTermId(event.target.value);
              clearFieldError("supportAreaTermId");
            }}
            aria-invalid={Boolean(fieldErrors.supportAreaTermId)}
            aria-describedby={
              fieldErrors.supportAreaTermId
                ? "kompas-intake-support-area-error"
                : undefined
            }
            className={cn(
              "border-line-strong rounded-tile bg-panel-canvas text-coffee focus:border-sage w-full border px-3.5 py-2.5 text-sm outline-none disabled:opacity-60",
              fieldErrors.supportAreaTermId
                ? "border-danger focus:border-danger"
                : "",
            )}
          >
            <option value="">Izaberite Intake oblast podrške</option>
            {supportAreas.map((supportArea) => (
              <option key={supportArea.termId} value={supportArea.termId}>
                {supportArea.publicLabel}
              </option>
            ))}
          </select>
          <FieldError
            id="kompas-intake-support-area-error"
            message={fieldErrors.supportAreaTermId}
          />
          <p className="text-ink-55 mt-1.5 text-[12px] leading-[1.45]">
            Zaključana sistemska vrednost iz D-052; izbor ne rangira terapeute.
          </p>
        </div>
      </div>

      <div className="border-line mt-5 flex flex-wrap gap-2.5 border-t pt-4">
        <button
          type="submit"
          disabled={
            createMutation.isPending ||
            topics.length === 0 ||
            supportAreas.length === 0
          }
          className="bg-forest text-panel-canvas hover:bg-forest-hover disabled:bg-ink-45 cursor-pointer rounded-full border-0 px-4 py-2.5 text-[13px] font-semibold transition-colors disabled:cursor-not-allowed"
        >
          {createMutation.isPending ? "Čuvanje…" : "Sačuvaj radnu verziju veze"}
        </button>
      </div>
    </form>
  );
}

export function IntakeLinks({
  links,
  terms,
  onCreated,
  onChanged,
}: {
  links: TaxonomyIntakeLink[];
  terms: TaxonomyTerm[];
  onCreated: (link: TaxonomyIntakeLink) => void;
  onChanged: (link: TaxonomyIntakeLink) => void;
}) {
  return (
    <div role="tabpanel" aria-label="Povezivanja">
      <div className="mb-4">
        <h2 className="text-forest font-serif text-[22px]">Povezivanja</h2>
        <p className="text-ink-55 mt-1 max-w-[760px] text-[13.5px] leading-[1.5]">
          Kontrolisani most između konkretne Kompas teme i zaključane sistemske
          Intake oblasti podrške. Status pokazuje da li je veza stručno
          potvrđena; ona ne bira niti rangira terapeuta.
        </p>
      </div>
      <IntakeLinkCreator terms={terms} links={links} onCreated={onCreated} />
      {links.length === 0 ? (
        <EmptyDashedCard title="Još nema povezivanja">
          Kompas teme i Intake oblasti podrške ostaju odvojene dok stručni tim
          ne potvrdi njihovu vezu.
        </EmptyDashedCard>
      ) : (
        <IntakeLinkCards links={links} onChanged={onChanged} />
      )}
    </div>
  );
}
