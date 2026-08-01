"use client";

import { useCallback, useState } from "react";

import type { TaxonomyTerm } from "../../taxonomy-api";
import {
  createTaxonomyTermDraft,
  type TaxonomyDraftFieldSetter,
  type TaxonomyTermDraft,
} from "./model";

export function useTaxonomyTermDraft(term: TaxonomyTerm | null) {
  const [draft, setDraft] = useState<TaxonomyTermDraft>(() =>
    createTaxonomyTermDraft(term),
  );

  const setField: TaxonomyDraftFieldSetter = useCallback((field, value) => {
    setDraft((current) => ({ ...current, [field]: value }));
  }, []);

  const toggleRelatedTopic = useCallback((termId: string) => {
    setDraft((current) => ({
      ...current,
      relatedTopicIds: current.relatedTopicIds.includes(termId)
        ? current.relatedTopicIds.filter((id) => id !== termId)
        : [...current.relatedTopicIds, termId],
    }));
  }, []);

  const resetFromTerm = useCallback((next: TaxonomyTerm | null) => {
    setDraft(createTaxonomyTermDraft(next));
  }, []);

  return { draft, setField, toggleRelatedTopic, resetFromTerm };
}
