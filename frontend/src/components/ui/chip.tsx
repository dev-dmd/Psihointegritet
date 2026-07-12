import { cva, type VariantProps } from "class-variance-authority";
import type { ReactNode } from "react";

import { cn } from "@/helpers/cn";

const chipVariants = cva("inline-flex items-center rounded-full", {
  variants: {
    variant: {
      /** Small tag pill, e.g. service meta and therapist areas. */
      tag: "bg-meadow/22 px-[13px] py-1.5 text-[13px] font-medium text-coffee",
      /** Tag pill with a subtle sage border (therapist areas). */
      tagOutlined:
        "border border-sage/25 bg-meadow/22 px-[13px] py-1.5 text-[13px] font-medium text-coffee",
      /** Uppercase label, sage on meadow wash (therapist badge). */
      label:
        "bg-meadow/28 px-3.5 py-[7px] text-xs font-semibold tracking-[0.1em] text-sage uppercase",
      /** Uppercase label on warm wash (resource category). */
      labelWarm:
        "bg-warm/28 px-3.5 py-[7px] text-xs font-semibold tracking-[0.1em] text-coffee uppercase",
      /** Uppercase label, solid meadow (featured service). */
      labelSolid:
        "bg-meadow px-3.5 py-[7px] text-xs font-semibold tracking-[0.1em] text-forest uppercase",
    },
  },
  defaultVariants: {
    variant: "tag",
  },
});

interface ChipProps extends VariantProps<typeof chipVariants> {
  children: ReactNode;
  className?: string;
}

export function Chip({ children, variant, className }: ChipProps) {
  return (
    <span className={cn(chipVariants({ variant }), className)}>{children}</span>
  );
}
