"use client";

import { StatusBadge } from "@/components/panel/status-badge";

import type { TaxonomyIntakeLink } from "../../taxonomy-api";
import { ActivityActorBadges, ApprovalEvidence } from "./activity-evidence";
import { STATUS_META } from "./constants";
import { formatDate } from "./helpers";
import { IntakeLinkGovernanceControls } from "./intake-link-governance-controls";

export function IntakeLinkCards({
  links,
  onChanged,
}: {
  links: TaxonomyIntakeLink[];
  onChanged?: (link: TaxonomyIntakeLink) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-3.5 xl:grid-cols-2">
      {[...links]
        .sort((left, right) =>
          left.topicLabel.localeCompare(right.topicLabel, "sr-Latn"),
        )
        .map((link) => {
          const status = STATUS_META[link.status];
          return (
            <article
              key={link.linkId}
              className="rounded-card border-line bg-surface border px-5 py-[18px] md:px-6 md:py-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-ink-45 text-[10.5px] font-semibold tracking-[0.12em] uppercase">
                    Kompas tema
                  </div>
                  <h3 className="text-coffee mt-1 font-serif text-[20px]">
                    {link.topicLabel}
                  </h3>
                  <div className="text-ink-45 mt-0.5 font-mono text-[11.5px]">
                    {link.topicStableId}
                  </div>
                </div>
                <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
              </div>
              <div className="border-line mt-4 border-t pt-4">
                <div className="text-ink-45 text-[10.5px] font-semibold tracking-[0.12em] uppercase">
                  Intake oblast podrške
                </div>
                <div className="text-forest mt-1 text-[14px] font-semibold">
                  {link.supportAreaLabel}
                </div>
                <div className="text-ink-45 mt-0.5 font-mono text-[11.5px]">
                  {link.supportAreaStableId}
                </div>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <ActivityActorBadges
                  createdBy={link.createdBy}
                  updatedBy={link.updatedBy}
                  events={link.events}
                />
                <span className="text-ink-45 text-[11.5px]">
                  {formatDate(link.updatedAt)}
                </span>
              </div>
              <ApprovalEvidence decisions={link.decisions} />
              {onChanged ? (
                <IntakeLinkGovernanceControls
                  link={link}
                  onChanged={onChanged}
                />
              ) : null}
            </article>
          );
        })}
    </div>
  );
}
