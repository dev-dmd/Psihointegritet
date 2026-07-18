"use client";

interface ResearchLauncherProps {
  open: boolean;
  onOpen: () => void;
}

/**
 * Floating "?" button — now opens the research survey (spec §4/§17). The guided
 * matching flow keeps its own entry points ("Zakaži termin", hero, „Vođeni
 * izbor"). Hidden while the drawer is open.
 */
export function ResearchLauncher({ open, onOpen }: ResearchLauncherProps) {
  if (open) {
    return null;
  }

  return (
    <div className="group fixed right-5 bottom-5 z-[70] flex items-center gap-3 md:right-8 md:bottom-8">
      <span className="bg-forest text-canvas pointer-events-none hidden rounded-full px-4 py-2 text-[13px] font-medium opacity-0 shadow-[var(--shadow-pill)] transition-opacity duration-200 group-hover:opacity-100 md:block">
        Podelite mišljenje
      </span>
      <button
        type="button"
        aria-label="Podelite mišljenje — kratka anketa"
        onClick={onOpen}
        className="bg-forest text-meadow shadow-help hover:bg-forest-hover flex h-14 w-14 cursor-pointer items-center justify-center rounded-full border-0 font-serif text-[26px] transition-all duration-[250ms] hover:scale-[1.07] md:h-16 md:w-16 md:text-3xl"
      >
        ?
      </button>
    </div>
  );
}
