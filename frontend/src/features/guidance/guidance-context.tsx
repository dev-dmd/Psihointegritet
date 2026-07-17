"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import type { ReactNode } from "react";

import { GuidanceDrawer } from "./guidance-drawer";
import { GuidanceLauncher } from "./guidance-launcher";

/** Where the drawer starts: the two-way chooser, or straight into the quiz. */
export type GuidanceEntry = "chooser" | "quiz";

interface GuidanceContextValue {
  /** Two-way chooser: „Pomozite mi da pronađem terapeuta" vs „Znam kog terapeuta želim". */
  openChooser: () => void;
  /** Straight into the 5-step matching quiz — no intermediate step. */
  openQuiz: () => void;
}

const GuidanceContext = createContext<GuidanceContextValue | null>(null);

/**
 * Owns the guided-selection drawer for the whole public area. Entry points pick
 * how it opens: „Zakaži termin" opens the chooser (returning clients skip the
 * quiz), while the hero and the „Vođeni izbor" section open the quiz directly.
 * Mounted once in the (public) layout — never per page.
 *
 * The drawer is mounted only while open, so every run starts fresh and no
 * answers survive a close (master plan T13 — answers are never persisted).
 */
export function GuidanceProvider({ children }: { children: ReactNode }) {
  const [entry, setEntry] = useState<GuidanceEntry | null>(null);

  const openChooser = useCallback(() => {
    setEntry("chooser");
  }, []);
  const openQuiz = useCallback(() => {
    setEntry("quiz");
  }, []);
  const close = useCallback(() => {
    setEntry(null);
  }, []);

  const value = useMemo(
    () => ({ openChooser, openQuiz }),
    [openChooser, openQuiz],
  );

  return (
    <GuidanceContext.Provider value={value}>
      {children}
      <GuidanceLauncher open={entry !== null} onOpen={openQuiz} />
      {entry !== null ? <GuidanceDrawer entry={entry} onClose={close} /> : null}
    </GuidanceContext.Provider>
  );
}

export function useGuidance(): GuidanceContextValue {
  const context = useContext(GuidanceContext);
  if (context === null) {
    throw new Error("useGuidance must be used inside a GuidanceProvider");
  }
  return context;
}
