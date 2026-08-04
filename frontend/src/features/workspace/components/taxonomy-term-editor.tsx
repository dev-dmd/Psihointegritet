"use client";

import type { FormEvent } from "react";

import { useSaveTaxonomyTermMutation } from "../hooks/use-taxonomy-registry";
import type { TaxonomyTerm } from "../taxonomy-api";
import { LockIcon } from "./icons";
import {
  TaxonomyContentFields,
  TaxonomyDescriptionField,
} from "./taxonomy-term-form/content-fields";
import { TaxonomyIdentityFields } from "./taxonomy-term-form/identity-fields";
import {
  AXIS_EDITOR_CONFIG,
  buildTaxonomyTermSavePayload,
  type ManagedTaxonomyAxis,
  validateTaxonomyTermDraft,
} from "./taxonomy-term-form/model";
import { TaxonomyOrganizationFields } from "./taxonomy-term-form/organization-fields";
import { useTaxonomyFormErrors } from "./taxonomy-term-form/use-taxonomy-form-errors";
import { useTaxonomyTermDraft } from "./taxonomy-term-form/use-taxonomy-term-draft";

export { AXIS_EDITOR_CONFIG } from "./taxonomy-term-form/model";
export type { ManagedTaxonomyAxis } from "./taxonomy-term-form/model";

interface TaxonomyTermEditorProps {
  axis: ManagedTaxonomyAxis;
  term: TaxonomyTerm | null;
  registryTerms: TaxonomyTerm[];
  onSaved: (term: TaxonomyTerm) => void;
  onCancel: () => void;
}

/**
 * The full registry editor remains the advanced surface. Quick Entry and this
 * form intentionally share the same draft projection, validators and fields,
 * so changing one registry rule cannot create a second wire contract.
 */
export function TaxonomyTermEditor({
  axis,
  term,
  registryTerms,
  onSaved,
  onCancel,
}: TaxonomyTermEditorProps) {
  const config = AXIS_EDITOR_CONFIG[axis];
  const editorId = `taxonomy-${axis}-${term?.termId ?? "new"}`;
  const { draft, setField } = useTaxonomyTermDraft(term);
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
  const protectedTargetReason = term?.systemDefined
    ? "Sistemska vrednost se ne uređuje kroz ovaj formular. Njeni ID i semantika ostaju zaštićeni."
    : term && term.axis !== axis
      ? "Ova stavka pripada drugom registru i ne može se uređivati iz otvorenog taba."
      : null;

  const saveMutation = useSaveTaxonomyTermMutation({
    onSaved,
    onFailed: (error) =>
      applyApiError(
        error,
        "Izmena nije sačuvana. Pokušajte ponovo.",
        // A name collision is reported next to the name, the field the
        // author can actually change; the internal id is derived from it.
        term ? undefined : "publicLabel",
      ),
  });

  if (protectedTargetReason) {
    return (
      <section
        className="border-danger/45 bg-danger/8 rounded-panel mb-5 border px-5 py-4"
        role="alert"
      >
        <div className="text-coffee flex items-center gap-2 text-[14px] font-semibold">
          <LockIcon size={16} aria-hidden />
          Zaštićen registar
        </div>
        <p className="text-ink-70 mt-1 text-[13px] leading-[1.5]">
          {protectedTargetReason}
        </p>
        <button
          type="button"
          onClick={onCancel}
          className="border-line-strong text-ink-70 hover:border-coffee/35 mt-4 cursor-pointer rounded-full border bg-transparent px-4 py-2 text-[12.5px] font-semibold transition-colors"
        >
          Zatvori
        </button>
      </section>
    );
  }

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    clearErrors();
    const issue = validateTaxonomyTermDraft(axis, draft, {
      hasPersistedTerm: Boolean(term),
      scope: "complete",
    });
    if (issue) {
      applyValidationIssue(issue);
      return;
    }
    saveMutation.mutate(buildTaxonomyTermSavePayload({ axis, draft, term }));
  };

  const fields = {
    axis,
    term,
    registryTerms,
    draft,
    setField,
    disabled: saveMutation.isPending,
    editorId,
    fieldErrors,
    clearFieldError,
    errorId,
    inputClass,
  };

  return (
    <form
      onSubmit={submit}
      className="rounded-panel border-sage/55 bg-surface mb-5 border px-5 py-5 md:px-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-ink-45 text-[10.5px] font-semibold tracking-[0.12em] uppercase">
            Napredno uređivanje
          </div>
          <h3 className="text-forest mt-1 font-serif text-[21px]">
            {term ? `Uredi: ${term.publicLabel}` : config.newLabel}
          </h3>
        </div>
        {term ? (
          <span className="bg-badge-neutral-bg text-badge-neutral rounded-full px-2.5 py-1 text-[11.5px] font-semibold">
            {term.versionLabel}
          </span>
        ) : null}
      </div>

      {serverError ? (
        <div
          role="alert"
          className="border-danger/45 bg-danger/8 text-ink-70 rounded-tile mt-4 border px-4 py-3 text-[13px] leading-[1.5]"
        >
          {serverError}
        </div>
      ) : null}

      <TaxonomyIdentityFields {...fields} />
      {/* Rendered here, once. `TaxonomyContentFields` no longer carries it. */}
      <TaxonomyDescriptionField {...fields} />
      <TaxonomyOrganizationFields {...fields} />
      <TaxonomyContentFields {...fields} />

      <div className="border-line mt-5 flex flex-wrap gap-2.5 border-t pt-4">
        <button
          type="submit"
          disabled={saveMutation.isPending}
          className="bg-forest text-panel-canvas hover:bg-forest-hover cursor-pointer rounded-full border-0 px-5 py-2.5 text-[13px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saveMutation.isPending
            ? "Čuvanje…"
            : term
              ? "Sačuvaj izmene"
              : "Sačuvaj radnu verziju"}
        </button>
        <button
          type="button"
          disabled={saveMutation.isPending}
          onClick={onCancel}
          className="border-line-strong text-ink-70 hover:border-coffee/40 cursor-pointer rounded-full border bg-transparent px-5 py-2.5 text-[13px] font-semibold disabled:cursor-not-allowed disabled:opacity-50"
        >
          Odustani
        </button>
      </div>
    </form>
  );
}
