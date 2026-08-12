import type { ActorSummary } from "@/components/panel/actor-badge";
import type { ApprovalCapability } from "@/lib/content-governance/types";

import type { TaxonomyStatus } from "../../taxonomy-api";

export type KompasTab =
  "areas" | "topics" | "audiences" | "goals" | "links" | "review";

/** The subset of `TaxonomyTerm.decisions` / `TaxonomyIntakeLink.decisions` the
 * evidence and approval surfaces actually read — both wire shapes satisfy it. */
export interface ReviewDecisionView {
  capability: ApprovalCapability;
  outcome: "approved" | "rejected";
  note?: string | null;
  decidedBy?: ActorSummary | null;
  decidedAt?: string;
}

/** Same idea for lifecycle audit events. */
export interface AuditEventView {
  toStatus: TaxonomyStatus;
  actor?: ActorSummary | null;
}
