import type { ReactNode } from "react";

import { cn } from "@/helpers/cn";

interface KVProps {
  label: string;
  children: ReactNode;
  /** Big serif value (names, plans) instead of the default 14px semibold. */
  serif?: boolean;
  className?: string;
}

/** Key–value pair: uppercase muted label above the value (panel handoff §7). */
export function KV({ label, children, serif, className }: KVProps) {
  return (
    <div className={className}>
      <div className="text-ink-45 text-[11px] font-semibold tracking-[0.12em] uppercase">
        {label}
      </div>
      <div
        className={cn(
          "text-coffee mt-1",
          serif
            ? "font-serif text-xl leading-[1.2]"
            : "text-sm leading-[1.45] font-semibold",
        )}
      >
        {children}
      </div>
    </div>
  );
}
