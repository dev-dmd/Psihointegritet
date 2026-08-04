"use client";

import { useRef, useState } from "react";

import { cn } from "@/helpers/cn";

import { useSaveTaxonomyTermMutation } from "../hooks/use-taxonomy-registry";
import type { TaxonomyRoute, TaxonomyTerm } from "../taxonomy-api";
import { RouteGovernanceControls } from "./screen-kompas/route-governance-controls";
import { isManagedAxis, sortTerms } from "./screen-kompas/helpers";
import {
  TaxonomyContentFields,
  TaxonomyDescriptionField,
} from "./taxonomy-term-form/content-fields";
import { TaxonomyDuplicateHint } from "./taxonomy-term-form/taxonomy-duplicate-hint";
import { TaxonomyIdentityFields } from "./taxonomy-term-form/identity-fields";
import {
  AXIS_EDITOR_CONFIG,
  buildTaxonomyTermSavePayload,
  type ManagedTaxonomyAxis,
  type TaxonomyValidationScope,
  validateTaxonomyTermDraft,
} from "./taxonomy-term-form/model";
import { TaxonomyOrganizationFields } from "./taxonomy-term-form/organization-fields";
import {
  QuickEntryHeader,
  QuickEntryLauncher,
  QuickEntrySaveActions,
  type QuickEntryStep,
} from "./taxonomy-term-form/quick-entry-chrome";
import { QuickEntryReview } from "./taxonomy-term-form/quick-entry-review";
import { useTaxonomyFormErrors } from "./taxonomy-term-form/use-taxonomy-form-errors";
import { useTaxonomyTermDraft } from "./taxonomy-term-form/use-taxonomy-term-draft";

const AXES: readonly {
  axis: ManagedTaxonomyAxis;
  description: string;
}[] = [
  { axis: "topic_group", description: "Javna oblast koja okuplja teme." },
  { axis: "topic", description: "Konkretna tema unutar jedne oblasti." },
  { axis: "audience", description: "Kontrolisana publika za preporuke." },
  {
    axis: "content_goal",
    description: "Kontrolisani cilj sadržaja i preporuke.",
  },
];

interface PendingSave {
  nextStep: QuickEntryStep;
  closeAfterSave: boolean;
}

export function TaxonomyQuickEntry({
  terms,
  onSaved,
}: {
  terms: TaxonomyTerm[];
  onSaved: (term: TaxonomyTerm) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<QuickEntryStep>(0);
  const [axis, setAxis] = useState<ManagedTaxonomyAxis>("topic_group");
  const [activeTerm, setActiveTerm] = useState<TaxonomyTerm | null>(null);
  const [resumeTermId, setResumeTermId] = useState("");
  const pendingSave = useRef<PendingSave>({
    nextStep: 1,
    closeAfterSave: false,
  });
  const { draft, setField, resetFromTerm } = useTaxonomyTermDraft(activeTerm);
  const editorId = `taxonomy-quick-${activeTerm?.termId ?? axis}`;
  const {
    fieldErrors,
    serverError,
    clearFieldError,
    clearErrors,
    applyValidationIssue,
    applyApiError,
    errorId,
    inputClass,
  } = useTaxonomyFormErrors(editorId);

  const adoptTerm = (saved: TaxonomyTerm) => {
    setActiveTerm(saved);
    resetFromTerm(saved);
    onSaved(saved);
  };
  const saveMutation = useSaveTaxonomyTermMutation({
    onSaved: (saved) => {
      adoptTerm(saved);
      setStep(pendingSave.current.nextStep);
      if (pendingSave.current.closeAfterSave) setIsOpen(false);
    },
    onFailed: (error) =>
      applyApiError(
        error,
        "Radna verzija nije sačuvana. Pokušajte ponovo.",
        // A name collision is reported next to the name, the field the
        // author can actually change; the internal id is derived from it.
        activeTerm ? undefined : "publicLabel",
      ),
  });

  const resumableTerms = sortTerms(
    terms.filter(
      (term) =>
        !term.systemDefined &&
        term.status === "draft" &&
        isManagedAxis(term.axis),
    ),
  );

  const saveStep = (
    scope: TaxonomyValidationScope,
    nextStep: QuickEntryStep,
    closeAfterSave: boolean,
  ) => {
    clearErrors();
    let issue = validateTaxonomyTermDraft(axis, draft, {
      hasPersistedTerm: Boolean(activeTerm),
      scope,
      requireDescription: scope === "content" || scope === "complete",
    });
    if (!issue && scope === "identity") {
      issue = validateTaxonomyTermDraft(axis, draft, {
        hasPersistedTerm: Boolean(activeTerm),
        scope: "content",
        requireDescription: true,
      });
    }
    if (issue) {
      applyValidationIssue(issue);
      return;
    }
    if (!activeTerm && scope !== "identity") return;
    pendingSave.current = { nextStep, closeAfterSave };
    saveMutation.mutate(
      buildTaxonomyTermSavePayload({ axis, draft, term: activeTerm }),
    );
  };

  const startNew = () => {
    setAxis("topic_group");
    setActiveTerm(null);
    resetFromTerm(null);
    setStep(0);
    clearErrors();
    setIsOpen(true);
  };
  const resume = (term: TaxonomyTerm) => {
    if (!isManagedAxis(term.axis)) return;
    setAxis(term.axis);
    setActiveTerm(term);
    resetFromTerm(term);
    setStep(1);
    clearErrors();
    setIsOpen(true);
  };
  const mergeRoute = (route: TaxonomyRoute) => {
    if (!activeTerm) return;
    adoptTerm({ ...activeTerm, canonicalPath: route.canonicalPath });
  };

  if (!isOpen) {
    return (
      <QuickEntryLauncher
        inProgressLabel={
          step > 0
            ? activeTerm?.publicLabel || draft.publicLabel || "nesačuvan unos"
            : null
        }
        resumableTerms={resumableTerms}
        resumeTermId={resumeTermId}
        onResumeTermIdChange={setResumeTermId}
        onContinue={() => setIsOpen(true)}
        onResumeSelected={() => {
          const selected = resumableTerms.find(
            (term) => term.termId === resumeTermId,
          );
          if (selected) resume(selected);
        }}
        onStartNew={startNew}
      />
    );
  }

  const fields = {
    axis,
    term: activeTerm,
    registryTerms: terms,
    draft,
    setField,
    disabled: saveMutation.isPending,
    editorId,
    fieldErrors,
    clearFieldError,
    errorId,
    inputClass,
  };
  const routeEligible = axis === "topic_group" || axis === "topic";

  return (
    <section className="border-sage/65 bg-surface rounded-panel mb-6 border px-5 py-5 md:px-6">
      <QuickEntryHeader step={step} onExit={() => setIsOpen(false)} />
      {serverError ? (
        <p
          role="alert"
          className="border-danger/45 bg-danger/8 text-ink-70 rounded-tile mt-4 border px-4 py-3 text-[13px]"
        >
          {serverError}
        </p>
      ) : null}

      {step === 0 ? (
        <div className="mt-5">
          <p className="text-ink-55 text-[13px] leading-[1.5]">
            Izaberite upravljani registar. Sistemski journey intent-i ostaju
            zaključani i biraju se kasnije kao kontrolisana vrednost.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {AXES.map((option) => (
              <button
                key={option.axis}
                type="button"
                disabled={Boolean(activeTerm)}
                aria-pressed={axis === option.axis}
                onClick={() => setAxis(option.axis)}
                className={cn(
                  "rounded-tile cursor-pointer border px-4 py-3 text-left disabled:cursor-not-allowed disabled:opacity-55",
                  axis === option.axis
                    ? "border-sage bg-sage/10"
                    : "border-line-strong hover:border-coffee/35 bg-transparent",
                )}
              >
                <span className="text-coffee block text-[13.5px] font-semibold">
                  {AXIS_EDITOR_CONFIG[option.axis].newLabel}
                </span>
                <span className="text-ink-55 mt-1 block text-[12px]">
                  {option.description}
                </span>
              </button>
            ))}
          </div>
          {activeTerm ? (
            <p className="text-ink-55 mt-3 text-[12px]">
              Registar je zaključan zajedno sa stabilnim ID-jem nakon prvog
              čuvanja.
            </p>
          ) : null}
          <div className="border-line mt-5 flex gap-2 border-t pt-4">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="bg-forest text-panel-canvas hover:bg-forest-hover cursor-pointer rounded-full border-0 px-5 py-2.5 text-[13px] font-semibold"
            >
              Nastavi na identitet
            </button>
          </div>
        </div>
      ) : null}

      {step === 1 ? (
        <div>
          <p className="text-ink-55 mt-5 text-[13px] leading-[1.5]">
            Prvo čuvanje pravi radnu verziju. Naziv i opis ostaju izmenjivi.
          </p>
          <TaxonomyIdentityFields {...fields} />
          <TaxonomyDuplicateHint
            candidateLabel={draft.publicLabel}
            axis={axis}
            terms={terms}
            onOpenExisting={resume}
          />
          <TaxonomyDescriptionField {...fields} />
          <QuickEntrySaveActions
            busy={saveMutation.isPending}
            onBack={() => setStep(0)}
            onContinue={() => saveStep("identity", 2, false)}
            onExit={() => saveStep("identity", 2, true)}
          />
        </div>
      ) : null}

      {step === 2 ? (
        <div>
          <TaxonomyOrganizationFields {...fields} />
          <QuickEntrySaveActions
            busy={saveMutation.isPending}
            onBack={() => setStep(1)}
            onContinue={() => saveStep("organization", 3, false)}
            onExit={() => saveStep("organization", 3, true)}
          />
        </div>
      ) : null}

      {step === 3 ? (
        <div>
          <TaxonomyContentFields {...fields} />
          <p className="border-line bg-panel-canvas text-ink-55 rounded-tile mt-4 border px-4 py-3 text-[12px] leading-[1.5]">
            Povezane teme sačuvane su u prethodnom koraku. Postojeći sadržaj se
            povezuje kasnije kroz K3 discovery metadata u CMS-u, bez slobodnih
            tag stringova i bez novog content tipa.
          </p>
          <QuickEntrySaveActions
            busy={saveMutation.isPending}
            onBack={() => setStep(2)}
            onContinue={() => saveStep("content", 4, false)}
            onExit={() => saveStep("content", 4, true)}
          />
        </div>
      ) : null}

      {step === 4 && activeTerm ? (
        <div className="mt-5">
          {routeEligible ? (
            <RouteGovernanceControls
              term={activeTerm}
              onConfirmed={mergeRoute}
            />
          ) : (
            <p className="border-line bg-panel-canvas rounded-tile border px-4 py-4 text-[13px] leading-[1.5]">
              Publika i cilj sadržaja nemaju samostalnu javnu slug stranicu;
              ovaj korak je zato završen bez kreiranja putanje.
            </p>
          )}
          <QuickEntrySaveActions
            busy={false}
            onBack={() => setStep(3)}
            onContinue={() => {
              if (!routeEligible || activeTerm.canonicalPath) setStep(5);
            }}
            onExit={() => {
              if (!routeEligible || activeTerm.canonicalPath) setIsOpen(false);
            }}
            continueLabel={
              routeEligible && !activeTerm.canonicalPath
                ? "Prvo potvrdite putanju"
                : "Nastavi na pregled"
            }
            continueDisabled={routeEligible && !activeTerm.canonicalPath}
            exitDisabled={routeEligible && !activeTerm.canonicalPath}
          />
        </div>
      ) : null}

      {step === 5 && activeTerm ? (
        <QuickEntryReview
          axis={axis}
          term={activeTerm}
          registryTerms={terms}
          busy={saveMutation.isPending}
          onChanged={adoptTerm}
          onSaveDraft={() => saveStep("complete", 5, false)}
          onBack={() => setStep(4)}
          onExit={() => setIsOpen(false)}
        />
      ) : null}
    </section>
  );
}
