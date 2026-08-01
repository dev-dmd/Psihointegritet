"use client";

import { cn } from "@/helpers/cn";

export function RegistryFlag({
  active,
  children,
}: {
  active: boolean;
  children: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-1 text-[11.5px] font-semibold",
        active
          ? "bg-badge-ok-bg text-badge-ok"
          : "bg-badge-neutral-bg text-badge-neutral",
      )}
    >
      {children}
    </span>
  );
}
