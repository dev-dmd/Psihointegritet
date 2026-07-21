"use client";

import { cn } from "@/helpers/cn";

import { useGates } from "../gates-context";
import type { ActivityKind } from "../types";

const KIND_DOT: Record<ActivityKind, string> = {
  err: "bg-danger/60",
  gate: "bg-warm",
  sys: "bg-coffee/30",
  ok: "bg-meadow",
};

/**
 * „Poslednja aktivnost" feed — client island reading the in-memory gates
 * context, so demo gate toggles land here immediately.
 */
export function ActivityFeed() {
  const { activity } = useGates();

  return (
    <div className="rounded-panel border-line bg-surface border px-6 pt-[22px] pb-3">
      <h2 className="text-coffee mb-2 font-serif text-[21px] font-normal">
        Poslednja aktivnost
      </h2>
      {activity.map((item, index) => (
        <div
          key={`${item.title}-${index}`}
          className="border-line flex items-start gap-3 border-t px-0.5 py-[11px]"
        >
          <span
            aria-hidden
            className={cn(
              "mt-1.5 h-2 w-2 shrink-0 rounded-full",
              KIND_DOT[item.kind],
            )}
          />
          <span className="flex-1">
            <span className="text-coffee block text-[13.5px] leading-[1.4] font-semibold">
              {item.title}
            </span>
            <span className="text-coffee/50 mt-0.5 block font-mono text-[11px]">
              {item.detail}
            </span>
          </span>
        </div>
      ))}
    </div>
  );
}
