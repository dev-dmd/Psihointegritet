"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useState } from "react";
import type { ReactNode } from "react";

import { ONLINE_EXPERIENCE_SURVEY_ID } from "@/content/survey";

import { ResearchDrawer } from "./research-drawer";
import { ResearchLauncher } from "./research-launcher";

/**
 * The floating "?" launcher + survey drawer. Auto-opens when the URL carries
 * `?survey=online-experience` on load so a newsletter or banner can deep-link
 * into the survey. `useSearchParams` lives here (inside a Suspense boundary
 * provided by ResearchProvider) so it never forces the whole page into client
 * rendering.
 */
function ResearchSurface() {
  const searchParams = useSearchParams();
  // Read the deep-link param once at mount — no effect, no cascading renders.
  const [open, setOpen] = useState(
    () => searchParams.get("survey") === ONLINE_EXPERIENCE_SURVEY_ID,
  );

  const openResearch = useCallback(() => setOpen(true), []);
  const closeResearch = useCallback(() => setOpen(false), []);

  return (
    <>
      <ResearchLauncher open={open} onOpen={openResearch} />
      {open ? <ResearchDrawer onClose={closeResearch} /> : null}
    </>
  );
}

/**
 * Mounts the research survey surface for the public area without wrapping page
 * content in the Suspense boundary that `useSearchParams` requires.
 */
export function ResearchProvider({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <Suspense fallback={null}>
        <ResearchSurface />
      </Suspense>
    </>
  );
}
