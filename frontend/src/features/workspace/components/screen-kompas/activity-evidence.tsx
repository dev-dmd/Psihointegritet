"use client";

import { ActorBadge, type ActorSummary } from "@/components/panel/actor-badge";
import { cn } from "@/helpers/cn";

import { APPROVAL_LABELS } from "./constants";
import { formatDate, latestActorForStatus } from "./helpers";
import type { AuditEventView, ReviewDecisionView } from "./types";

/** K2.7 — who created, last changed, published and archived a registry row.
 * Publish/archive come from the real lifecycle audit event, not from
 * `updatedBy`, so the badge cannot claim the wrong person. */
export function ActivityActorBadges({
  createdBy,
  updatedBy,
  events,
}: {
  createdBy: ActorSummary | null | undefined;
  updatedBy: ActorSummary | null | undefined;
  events: readonly AuditEventView[];
}) {
  const publishedBy = latestActorForStatus(events, "published");
  const archivedBy = latestActorForStatus(events, "archived");

  return (
    <div className="flex flex-wrap items-center gap-2">
      <ActorBadge action="Kreirao/la" actor={createdBy ?? null} />
      <ActorBadge action="Poslednja izmena" actor={updatedBy ?? null} />
      <ActorBadge action="Objavio/la" actor={publishedBy} />
      <ActorBadge action="Arhivirao/la" actor={archivedBy} />
    </div>
  );
}

export function ApprovalEvidence({
  decisions,
}: {
  decisions: readonly ReviewDecisionView[];
}) {
  if (decisions.length === 0) return null;

  return (
    <section className="border-line mt-4 border-t pt-3">
      <h4 className="text-ink-45 text-[10.5px] font-semibold tracking-[0.1em] uppercase">
        Odluke o odobrenju
      </h4>
      <div className="mt-2 flex flex-wrap gap-2">
        {decisions.map((decision) => {
          const decisionLabel = `${APPROVAL_LABELS[decision.capability]} ${
            decision.outcome === "approved" ? "odobrenje" : "nije odobreno"
          }`;
          return (
            <div
              key={decision.capability}
              className="border-line-strong rounded-tile flex flex-wrap items-center gap-2 border px-2.5 py-2"
            >
              <span
                className={cn(
                  "text-[11.5px] font-semibold",
                  decision.outcome === "approved"
                    ? "text-badge-ok"
                    : "text-danger",
                )}
              >
                {decisionLabel}
              </span>
              <ActorBadge
                action={
                  decision.outcome === "approved" ? "Odobrio/la" : "Odbio/la"
                }
                actor={decision.decidedBy ?? null}
              />
              {decision.decidedAt ? (
                <span className="text-ink-45 text-[11px]">
                  {formatDate(decision.decidedAt)}
                </span>
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}
