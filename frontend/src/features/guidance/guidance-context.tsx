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

interface GuidanceContextValue {
  openGuidance: () => void;
}

const GuidanceContext = createContext<GuidanceContextValue | null>(null);

/**
 * Owns the guided-selection drawer for the whole public area: the floating
 * launcher and any section CTA („Pomozi mi da izaberem") open the same drawer.
 * Mounted once in the (public) layout — never per page.
 *
 * The drawer is mounted only while open, so every run starts at step one and no
 * answers survive a close (master plan T13 — answers are never persisted).
 */
export function GuidanceProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);

  const openGuidance = useCallback(() => {
    setOpen(true);
  }, []);
  const closeGuidance = useCallback(() => {
    setOpen(false);
  }, []);

  const value = useMemo(() => ({ openGuidance }), [openGuidance]);

  return (
    <GuidanceContext.Provider value={value}>
      {children}
      <GuidanceLauncher open={open} onOpen={openGuidance} />
      {open ? <GuidanceDrawer onClose={closeGuidance} /> : null}
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
