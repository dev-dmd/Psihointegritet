"use client";

import { cn } from "@/helpers/cn";

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  /** Accessible name — what this switch controls. */
  label: string;
  disabled?: boolean;
  className?: string;
}

/** Small switch (feature gates). 40×23, sage when on. */
export function Toggle({
  checked,
  onChange,
  label,
  disabled,
  className,
}: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative h-[23px] w-10 shrink-0 cursor-pointer rounded-full border-0 transition-colors duration-200",
        checked ? "bg-sage" : "bg-coffee/18",
        disabled && "cursor-not-allowed opacity-50",
        className,
      )}
    >
      <span
        aria-hidden
        className={cn(
          "bg-surface absolute top-[3px] left-[3px] h-[17px] w-[17px] rounded-full shadow-sm transition-transform duration-200",
          checked && "translate-x-[17px]",
        )}
      />
    </button>
  );
}
