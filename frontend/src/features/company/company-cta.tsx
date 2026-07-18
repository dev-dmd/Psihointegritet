"use client";

import type { ReactNode } from "react";

import {
  buttonLinkVariants,
  type ButtonLinkVariant,
} from "@/components/ui/button-link";
import { cn } from "@/helpers/cn";

import { useCompany } from "./company-context";

/** Button that opens the B2B configurator drawer. Matches ButtonLink styling. */
export function CompanyCta({
  children,
  variant = "meadow",
  className,
}: {
  children: ReactNode;
  variant?: ButtonLinkVariant;
  className?: string;
}) {
  const { openCompany } = useCompany();
  return (
    <button
      type="button"
      onClick={openCompany}
      className={cn(
        "cursor-pointer border-0",
        buttonLinkVariants({ variant }),
        className,
      )}
    >
      {children}
    </button>
  );
}
