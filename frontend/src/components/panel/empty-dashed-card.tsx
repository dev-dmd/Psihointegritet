import type { ReactNode } from "react";

import { cn } from "@/helpers/cn";

interface EmptyDashedCardProps {
  title: string;
  children?: ReactNode;
  /** Shows the amber „Uskoro" badge (planned modules). */
  soon?: boolean;
  className?: string;
}

/** Dashed placeholder card for planned modules and empty slots. */
export function EmptyDashedCard({
  title,
  children,
  soon,
  className,
}: EmptyDashedCardProps) {
  return (
    <div
      className={cn(
        "rounded-panel border-coffee/18 bg-surface/60 border-[1.5px] border-dashed px-6 py-7",
        className,
      )}
    >
      <div className="flex items-center gap-3">
        <h3 className="text-coffee font-serif text-xl">{title}</h3>
        {soon ? (
          <span className="bg-badge-amber-bg text-badge-amber rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-[0.08em] uppercase">
            Uskoro
          </span>
        ) : null}
      </div>
      {children ? (
        <div className="text-ink-55 mt-2 text-sm leading-[1.55]">
          {children}
        </div>
      ) : null}
    </div>
  );
}
