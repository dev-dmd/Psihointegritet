import type { ReactNode } from "react";

import { cn } from "@/helpers/cn";

const toneClasses = {
  sage: "text-sage",
  meadow: "text-meadow",
  coffee: "text-coffee/60",
} as const;

interface EyebrowProps {
  children: ReactNode;
  /** sage on light surfaces, meadow on forest, coffee on warm surfaces. */
  tone?: keyof typeof toneClasses;
  className?: string;
}

export function Eyebrow({ children, tone = "sage", className }: EyebrowProps) {
  return (
    <div
      className={cn(
        "text-[12.5px] font-semibold tracking-[0.16em] uppercase",
        toneClasses[tone],
        className,
      )}
    >
      {children}
    </div>
  );
}
