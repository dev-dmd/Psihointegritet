"use client";

import { useState } from "react";

import { GuidanceDrawer } from "./guidance-drawer";

/**
 * Floating "?" button that opens the guided-selection quiz. The drawer is
 * mounted only while open, so each run starts from the first step.
 */
export function GuidanceLauncher() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {!open ? (
        <button
          type="button"
          aria-label="Pomozite mi da pronađem podršku"
          onClick={() => setOpen(true)}
          className="bg-forest text-meadow shadow-help hover:bg-forest-hover fixed right-5 bottom-5 z-[70] flex h-14 w-14 cursor-pointer items-center justify-center rounded-full border-0 font-serif text-[26px] transition-all duration-[250ms] hover:scale-[1.07] md:right-8 md:bottom-8 md:h-16 md:w-16 md:text-3xl"
        >
          ?
        </button>
      ) : null}
      {open ? <GuidanceDrawer onClose={() => setOpen(false)} /> : null}
    </>
  );
}
