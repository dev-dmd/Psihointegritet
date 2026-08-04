"use client";

import { useState } from "react";

import { cn } from "@/helpers/cn";

import { taxonomyErrorMessage } from "../../hooks/use-taxonomy-registry";
import { taxonomyFieldErrors, TaxonomyApiError } from "../../taxonomy-api";
import { TAXONOMY_FIELD_COPY, taxonomyErrorCopy } from "./taxonomy-error-copy";
import type { TaxonomyValidationIssue } from "./model";

const FIELD_DOM_SUFFIX: Record<string, string> = {
  publicLabel: "label",
  primaryParentTermId: "parent",
  journeyIntentTermId: "journey",
  shortDescription: "description",
  searchTerms: "search-terms",
  sortOrder: "sort-order",
  relatedTopicIds: "related-topics",
  iconKey: "icon-key",
  assetId: "asset-id",
  internalExpertNote: "internal-note",
};

export function useTaxonomyFormErrors(editorId: string) {
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);

  const focusField = (field: string) => {
    const suffix = FIELD_DOM_SUFFIX[field];
    if (!suffix) return;
    requestAnimationFrame(() => {
      document.getElementById(`${editorId}-${suffix}`)?.focus({
        preventScroll: true,
      });
    });
  };
  const setFieldError = (field: string, message: string) => {
    // A key with no rendered input used to be stored anyway — and it cleared
    // the banner on its way out, so the user was left with no message at all
    // and a wizard that simply refused to advance. Anything we cannot point at
    // goes to the banner instead of disappearing.
    if (!FIELD_DOM_SUFFIX[field]) {
      setFieldErrors({});
      setServerError(message);
      return;
    }
    setServerError(null);
    setFieldErrors({ [field]: message });
    focusField(field);
  };
  const clearFieldError = (field: string) => {
    setServerError(null);
    setFieldErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  };
  const clearErrors = () => {
    setFieldErrors({});
    setServerError(null);
  };
  const applyValidationIssue = (issue: TaxonomyValidationIssue) => {
    setFieldError(issue.field, issue.message);
  };
  const applyApiError = (
    error: unknown,
    fallback: string,
    collisionField?: string,
  ) => {
    const copy = taxonomyErrorCopy(error);
    const humanised = copy.nextAction
      ? `${copy.message} ${copy.nextAction}`
      : copy.message;

    const apiFieldErrors = taxonomyFieldErrors(error);
    const [field, message] = Object.entries(apiFieldErrors)[0] ?? [];
    if (field && message) {
      // A phrased rule for this field beats the server's own sentence, which
      // is often an untranslated validator string.
      setFieldError(field, TAXONOMY_FIELD_COPY[field] ?? message);
      return;
    }
    if (
      collisionField &&
      error instanceof TaxonomyApiError &&
      (error.status === 409 || error.status === 422)
    ) {
      setFieldError(collisionField, humanised);
      return;
    }
    setServerError(error ? humanised : taxonomyErrorMessage(error, fallback));
  };
  const errorId = (field: string) =>
    `${editorId}-${FIELD_DOM_SUFFIX[field]}-error`;
  const inputClass = (field: string, base: string) =>
    cn(base, fieldErrors[field] ? "border-danger focus:border-danger" : "");

  return {
    fieldErrors,
    serverError,
    clearFieldError,
    clearErrors,
    applyValidationIssue,
    applyApiError,
    errorId,
    inputClass,
  };
}
