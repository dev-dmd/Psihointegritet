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
 * Preserves the existing drawer during the route migration for any explicitly
 * embedded legacy trigger. The canonical public flow is `/pronadji-podrsku`;
 * answers in either surface begin fresh and do not survive a close.
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
      {/* No floating launcher. The floating "?" opens the research survey. */}
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
