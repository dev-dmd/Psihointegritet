"use client";

import { useState } from "react";

import { cn } from "@/helpers/cn";

import { taxonomyErrorMessage } from "../../hooks/use-taxonomy-registry";
import { taxonomyFieldErrors, TaxonomyApiError } from "../../taxonomy-api";
import type { TaxonomyValidationIssue } from "./model";

const FIELD_DOM_SUFFIX: Record<string, string> = {
  publicLabel: "label",
  stableId: "stable-id",
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
    const apiFieldErrors = taxonomyFieldErrors(error);
    const [field, message] = Object.entries(apiFieldErrors)[0] ?? [];
    if (field && message) {
      setFieldError(field, message);
      return;
    }
    if (
      collisionField &&
      error instanceof TaxonomyApiError &&
      (error.status === 409 || error.status === 422)
    ) {
      setFieldError(collisionField, error.message);
      return;
    }
    setServerError(taxonomyErrorMessage(error, fallback));
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
