import type { ActorSummary } from "@/components/panel/actor-badge";

import type {
  TaxonomyAxis,
  TaxonomyStatus,
  TaxonomyTerm,
} from "../../taxonomy-api";
import type { ManagedTaxonomyAxis } from "../taxonomy-term-editor";
import type { AuditEventView } from "./types";

const DATE_FORMATTER = new Intl.DateTimeFormat("sr-Latn-RS", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

export function formatDate(value: string): string {
  return DATE_FORMATTER.format(new Date(value));
}

export function latestActorForStatus(
  events: readonly AuditEventView[],
  status: TaxonomyStatus,
): ActorSummary | null {
  return events.find((event) => event.toStatus === status)?.actor ?? null;
}

export function sortTerms(terms: TaxonomyTerm[]): TaxonomyTerm[] {
  return [...terms].sort(
    (left, right) =>
      left.sortOrder - right.sortOrder ||
      left.publicLabel.localeCompare(right.publicLabel, "sr-Latn"),
  );
}

export function publicLabelFor(
  terms: TaxonomyTerm[],
  axis: TaxonomyAxis,
  stableId: string | null | undefined,
): string | null {
  if (!stableId) return null;
  return (
    terms.find((term) => term.axis === axis && term.stableId === stableId)
      ?.publicLabel ?? null
  );
}

export function isManagedAxis(
  axis: TaxonomyAxis | undefined,
): axis is ManagedTaxonomyAxis {
  return (
    axis === "topic_group" ||
    axis === "topic" ||
    axis === "audience" ||
    axis === "content_goal"
  );
}

/** Only an unpublished, non-system term of the active axis may open the
 * editor — the panel mirrors the server guard rather than trusting the user to
 * know the managed/system split. */
export function isEditableManagedTerm(
  term: TaxonomyTerm,
  axis: ManagedTaxonomyAxis,
): boolean {
  return term.axis === axis && !term.systemDefined && term.status === "draft";
}
