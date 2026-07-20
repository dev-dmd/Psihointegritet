"use client";

import { cn } from "@/helpers/cn";

export interface TabPill {
  id: string;
  label: string;
  /** Rendered muted and non-interactive, e.g. „Korisnici · uskoro". */
  disabled?: boolean;
}

interface TabPillsProps {
  tabs: TabPill[];
  activeId: string;
  onChange: (id: string) => void;
  className?: string;
}

/** Pill tab row (tenant profile). Active pill is solid coffee. */
export function TabPills({
  tabs,
  activeId,
  onChange,
  className,
}: TabPillsProps) {
  return (
    <div
      role="tablist"
      className={cn("flex flex-wrap items-center gap-2", className)}
    >
      {tabs.map((tab) =>
        tab.disabled ? (
          <span
            key={tab.id}
            className="border-line-strong text-ink-45 rounded-full border border-dashed px-3.5 py-1.5 text-[13px] font-medium"
          >
            {tab.label}
          </span>
        ) : (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={tab.id === activeId}
            onClick={() => onChange(tab.id)}
            className={cn(
              "cursor-pointer rounded-full border px-3.5 py-1.5 text-[13px] font-semibold transition-colors",
              tab.id === activeId
                ? "border-coffee bg-coffee text-panel-canvas"
                : "border-line-strong text-ink-70 hover:border-coffee/40 bg-transparent",
            )}
          >
            {tab.label}
          </button>
        ),
      )}
    </div>
  );
}
