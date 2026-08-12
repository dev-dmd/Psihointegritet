import type { TaxonomyTerm } from "../../taxonomy-api";
import type {
  ManagedTaxonomyAxis,
  TaxonomyDraftFieldSetter,
  TaxonomyTermDraft,
} from "./model";

export interface TaxonomyTermFieldsProps {
  axis: ManagedTaxonomyAxis;
  term: TaxonomyTerm | null;
  registryTerms: TaxonomyTerm[];
  draft: TaxonomyTermDraft;
  setField: TaxonomyDraftFieldSetter;
  disabled: boolean;
  editorId: string;
  fieldErrors: Record<string, string>;
  clearFieldError: (field: string) => void;
  errorId: (field: string) => string;
  inputClass: (field: string, base: string) => string;
}
