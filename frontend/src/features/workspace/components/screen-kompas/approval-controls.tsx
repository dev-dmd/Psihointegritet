"use client";

import { useState } from "react";

import { ActorBadge } from "@/components/panel/actor-badge";
import type { ApprovalCapability } from "@/lib/content-governance/types";

import { APPROVAL_LABELS } from "./constants";
import type { ReviewDecisionView } from "./types";

export function ApprovalControls({
  capabilities,
  decisions,
  disabled,
  onDecision,
}: {
  capabilities: readonly ApprovalCapability[];
  decisions: readonly ReviewDecisionView[];
  disabled: boolean;
  onDecision: (
    capability: ApprovalCapability,
    outcome: "approved" | "rejected",
    note: string | undefined,
  ) => void;
}) {
  const [note, setNote] = useState("");
  return (
    <div className="border-line rounded-tile mt-3 border px-3.5 py-3.5">
      <h4 className="text-ink-70 text-[12.5px] font-semibold">
        Odobrenja za pregled
      </h4>
      <p className="text-ink-55 mt-1 text-[12px] leading-[1.45]">
        Svaka odluka ostavlja dokaz u ovoj reviziji. Nova odluka iste vrste
        zamenjuje prethodnu dok je stavka na pregledu.
      </p>
      <div className="mt-3 space-y-2.5">
        {capabilities.map((capability) => {
          const decision = decisions.find(
            (item) => item.capability === capability,
          );
          const label = APPROVAL_LABELS[capability];
          return (
            <div
              key={capability}
              className="border-line-strong rounded-tile flex flex-wrap items-center justify-between gap-2 border px-3 py-2.5"
            >
              <div>
                <div className="text-ink-70 text-[12.5px] font-semibold">
                  {label}
                </div>
                <div className="text-ink-45 mt-0.5 text-[11px]">
                  {decision?.outcome === "approved"
                    ? "Odobreno"
                    : decision?.outcome === "rejected"
                      ? "Nije odobreno"
                      : "Čeka odluku"}
                </div>
                {decision?.decidedBy ? (
                  <div className="mt-1.5">
                    <ActorBadge
                      action={
                        decision.outcome === "approved"
                          ? "Odobrio/la"
                          : "Odbio/la"
                      }
                      actor={decision.decidedBy}
                    />
                  </div>
                ) : null}
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() =>
                    onDecision(capability, "approved", note.trim() || undefined)
                  }
                  className="bg-forest text-panel-canvas hover:bg-forest-hover disabled:bg-ink-45 cursor-pointer rounded-full border-0 px-3 py-1.5 text-[11.5px] font-semibold transition-colors disabled:cursor-not-allowed"
                >
                  Odobri
                </button>
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() =>
                    onDecision(capability, "rejected", note.trim() || undefined)
                  }
                  className="border-line-strong text-ink-70 hover:border-danger/45 disabled:text-ink-45 cursor-pointer rounded-full border bg-transparent px-3 py-1.5 text-[11.5px] font-semibold transition-colors disabled:cursor-not-allowed"
                >
                  Ne odobravaj
                </button>
              </div>
            </div>
          );
        })}
      </div>
      <label className="text-ink-55 mt-3 block text-[11.5px]">
        Napomena odluke (opciono)
        <textarea
          value={note}
          maxLength={500}
          rows={2}
          disabled={disabled}
          onChange={(event) => setNote(event.target.value)}
          className="border-line-strong rounded-tile bg-panel-canvas text-coffee focus:border-sage mt-1.5 w-full resize-y border px-3 py-2 text-[12.5px] leading-[1.5] outline-none disabled:opacity-60"
        />
      </label>
    </div>
  );
}
