import { cva, type VariantProps } from "class-variance-authority";
import type { ReactNode } from "react";

import { cn } from "@/helpers/cn";

const buttonLinkVariants = cva(
  "inline-flex items-center justify-center rounded-full text-center font-semibold no-underline transition-colors duration-200",
  {
    variants: {
      variant: {
        primary: "bg-forest text-canvas hover:bg-forest-hover",
        meadow: "bg-meadow text-forest hover:bg-meadow-hover",
        warm: "bg-warm text-coffee hover:bg-warm-hover",
        coffee: "bg-coffee text-canvas hover:bg-coffee-hover",
        light: "bg-canvas text-forest hover:bg-meadow",
        outline:
          "border-[1.5px] border-coffee/25 text-coffee hover:border-sage hover:bg-meadow/15",
      },
      size: {
        md: "px-7 py-[15px] text-[15px]",
        lg: "px-8 py-4 text-[15.5px]",
      },
    },
    compoundVariants: [
      // Border replaces 1.5px of padding so outline height matches solid.
      { variant: "outline", size: "md", className: "py-[13.5px]" },
      { variant: "outline", size: "lg", className: "py-[14.5px]" },
    ],
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
);

interface ButtonLinkProps extends VariantProps<typeof buttonLinkVariants> {
  /** In-page anchors and routes; rendered as a plain anchor element. */
  href: string;
  children: ReactNode;
  className?: string;
  ariaLabel?: string;
}

export function ButtonLink({
  href,
  children,
  variant,
  size,
  className,
  ariaLabel,
}: ButtonLinkProps) {
  return (
    <a
      href={href}
      aria-label={ariaLabel}
      className={cn(buttonLinkVariants({ variant, size }), className)}
    >
      {children}
    </a>
  );
}
