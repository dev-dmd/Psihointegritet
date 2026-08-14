"use client";

import { useUserSafeError } from "@/lib/errors/use-user-safe-error";

import {
  useTaxonomyTermReviewMutation,
  useTaxonomyTermTransitionMutation,
} from "../../hooks/use-taxonomy-registry";
import type { TaxonomyStatus, TaxonomyTerm } from "../../taxonomy-api";
import { ApprovalControls } from "./approval-controls";
import { TERM_APPROVAL_CAPABILITIES } from "./constants";
import { GovernanceError } from "./governance-error";
import { LifecycleButton } from "./lifecycle-button";

const STATUS_COPY: Record<TaxonomyStatus, string> = {
  draft: "Radna verzija je spremna za slanje na pregled.",
  in_review: "Za odobrenje su potrebni stručno i poslovno odobrenje.",
  approved:
    "Odobrena verzija može biti objavljena ili vraćena u novu radnu verziju.",
  published: "Objavljena verzija ostaje u registru dok je ne arhivirate.",
  archived: "Arhivirana verzija može otvoriti novu radnu verziju.",
};

/** K2.6 — the real `draft → in_review → approved → published → archived` flow
 * plus the allowed returns. The server stays the authority for the lock and
 * the approval matrix; this only mirrors the rule so the UI does not offer a
 * button the backend would reject. */
export function TermGovernanceControls({
  term,
  onChanged,
}: {
  term: TaxonomyTerm;
  onChanged: (term: TaxonomyTerm) => void;
}) {
  const safeError = useUserSafeError();
  const transitionMutation = useTaxonomyTermTransitionMutation(term, onChanged);
  const reviewMutation = useTaxonomyTermReviewMutation(term, onChanged);

  const approvedCapabilities = new Set(
    term.decisions
      .filter((decision) => decision.outcome === "approved")
      .map((decision) => decision.capability),
  );
  const approvalsComplete = TERM_APPROVAL_CAPABILITIES.every((capability) =>
    approvedCapabilities.has(capability),
  );
  const busy = transitionMutation.isPending || reviewMutation.isPending;
  const cause = transitionMutation.isError
    ? transitionMutation.error
    : reviewMutation.isError
      ? reviewMutation.error
      : null;
  const error = cause ? safeError.text(cause, "taxonomy", "publish") : null;

  const button = (target: TaxonomyStatus, label: string, disabled = false) => (
    <LifecycleButton
      key={target}
      target={target}
      label={label}
      busy={busy}
      disabled={disabled}
      onClick={(next) => transitionMutation.mutate(next)}
    />
  );

  return (
    <div className="border-line mt-4 border-t pt-3">
      <div className="text-ink-55 text-[12px] leading-[1.45]">
        {STATUS_COPY[term.status]}
      </div>
      {term.status === "in_review" ? (
        <ApprovalControls
          capabilities={TERM_APPROVAL_CAPABILITIES}
          decisions={term.decisions}
          disabled={busy}
          onDecision={(capability, outcome, note) =>
            reviewMutation.mutate({ capability, outcome, note })
          }
        />
      ) : null}
      <div className="mt-3 flex flex-wrap gap-2">
        {term.status === "draft"
          ? button("in_review", "Pošalji na pregled")
          : null}
        {term.status === "in_review"
          ? [
              button("draft", "Vrati u radnu verziju"),
              button("approved", "Označi kao odobreno", !approvalsComplete),
            ]
          : null}
        {term.status === "approved"
          ? [
              button("draft", "Otvori novu radnu verziju"),
              button("published", "Objavi"),
            ]
          : null}
        {term.status === "published" ? button("archived", "Arhiviraj") : null}
        {term.status === "archived"
          ? button("draft", "Otvori novu radnu verziju")
          : null}
      </div>
      <GovernanceError error={error} />
    </div>
  );
}
