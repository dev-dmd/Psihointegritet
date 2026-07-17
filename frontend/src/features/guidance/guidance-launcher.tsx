"use client";

interface GuidanceLauncherProps {
  open: boolean;
  onOpen: () => void;
}

/**
 * Floating "?" button that opens the guided-selection quiz. Hidden while the
 * drawer is open. The open state lives in GuidanceProvider so that section CTAs
 * („Pomozi mi da izaberem") open the same drawer.
 */
export function GuidanceLauncher({ open, onOpen }: GuidanceLauncherProps) {
  if (open) {
    return null;
  }

  return (
    <button
      type="button"
      aria-label="Pomozite mi da pronađem podršku"
      onClick={onOpen}
      className="bg-forest text-meadow shadow-help hover:bg-forest-hover fixed right-5 bottom-5 z-[70] flex h-14 w-14 cursor-pointer items-center justify-center rounded-full border-0 font-serif text-[26px] transition-all duration-[250ms] hover:scale-[1.07] md:right-8 md:bottom-8 md:h-16 md:w-16 md:text-3xl"
    >
      ?
    </button>
  );
}
