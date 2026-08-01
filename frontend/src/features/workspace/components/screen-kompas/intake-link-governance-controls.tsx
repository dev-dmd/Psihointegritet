"use client";

import {
  firstTaxonomyError,
  useTaxonomyIntakeLinkReviewMutation,
  useTaxonomyIntakeLinkTransitionMutation,
} from "../../hooks/use-taxonomy-registry";
import type { TaxonomyIntakeLink, TaxonomyStatus } from "../../taxonomy-api";
import { ApprovalControls } from "./approval-controls";
import { LINK_APPROVAL_CAPABILITIES } from "./constants";
import { GovernanceError } from "./governance-error";
import { LifecycleButton } from "./lifecycle-button";

const STATUS_COPY: Record<TaxonomyStatus, string> = {
  draft: "Povezivanje je radna verzija i čeka stručni pregled.",
  in_review: "Za ovu vezu je potrebno stručno odobrenje.",
  approved:
    "Odobrena veza može biti objavljena ili vraćena u novu radnu verziju.",
  published: "Objavljena veza je aktivna u autorizovanom mostu ka Intake-u.",
  archived: "Arhivirana veza može otvoriti novu radnu verziju.",
};

/** Topic → Intake support area needs only the Clinical decision (K2.6); the
 * link never ranks or selects a therapist. */
export function IntakeLinkGovernanceControls({
  link,
  onChanged,
}: {
  link: TaxonomyIntakeLink;
  onChanged: (link: TaxonomyIntakeLink) => void;
}) {
  const transitionMutation = useTaxonomyIntakeLinkTransitionMutation(
    link,
    onChanged,
  );
  const reviewMutation = useTaxonomyIntakeLinkReviewMutation(link, onChanged);

  const approvalsComplete = link.decisions.some(
    (decision) =>
      decision.capability === "clinical" && decision.outcome === "approved",
  );
  const busy = transitionMutation.isPending || reviewMutation.isPending;
  const error = firstTaxonomyError([
    {
      isError: transitionMutation.isError,
      error: transitionMutation.error,
      fallback: "Promena statusa povezivanja nije sačuvana. Pokušajte ponovo.",
    },
    {
      isError: reviewMutation.isError,
      error: reviewMutation.error,
      fallback: "Odluka nije sačuvana. Pokušajte ponovo.",
    },
  ]);

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
        {STATUS_COPY[link.status]}
      </div>
      {link.status === "in_review" ? (
        <ApprovalControls
          capabilities={LINK_APPROVAL_CAPABILITIES}
          decisions={link.decisions}
          disabled={busy}
          onDecision={(_capability, outcome, note) =>
            reviewMutation.mutate({ outcome, note })
          }
        />
      ) : null}
      <div className="mt-3 flex flex-wrap gap-2">
        {link.status === "draft"
          ? button("in_review", "Pošalji na pregled")
          : null}
        {link.status === "in_review"
          ? [
              button("draft", "Vrati u radnu verziju"),
              button("approved", "Označi kao odobreno", !approvalsComplete),
            ]
          : null}
        {link.status === "approved"
          ? [
              button("draft", "Otvori novu radnu verziju"),
              button("published", "Objavi"),
            ]
          : null}
        {link.status === "published" ? button("archived", "Arhiviraj") : null}
        {link.status === "archived"
          ? button("draft", "Otvori novu radnu verziju")
          : null}
      </div>
      <GovernanceError error={error} />
    </div>
  );
}
