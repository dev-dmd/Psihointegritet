"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import type { ReactNode } from "react";

import { CompanyConfiguratorDrawer } from "./company-configurator-drawer";

interface CompanyContextValue {
  openCompany: (preselectedPlanSlug?: string) => void;
}

const CompanyContext = createContext<CompanyContextValue | null>(null);

/**
 * Owns the B2B configurator drawer for the public area. Opened from the
 * „Rad sa kompanijama" page CTA and optional plan cards. It is intentionally
 * separate from the individual guided-selection flow.
 * Mounted only while open, so every run starts fresh (no answers persist).
 */
export function CompanyProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [preselectedPlanSlug, setPreselectedPlanSlug] = useState<string | null>(
    null,
  );

  const openCompany = useCallback((planSlug?: string) => {
    setPreselectedPlanSlug(planSlug ?? null);
    setOpen(true);
  }, []);
  const closeCompany = useCallback(() => {
    setOpen(false);
    setPreselectedPlanSlug(null);
  }, []);

  const value = useMemo(() => ({ openCompany }), [openCompany]);

  return (
    <CompanyContext.Provider value={value}>
      {children}
      {open ? (
        <CompanyConfiguratorDrawer
          onClose={closeCompany}
          preselectedPlanSlug={preselectedPlanSlug}
        />
      ) : null}
    </CompanyContext.Provider>
  );
}

export function useCompany(): CompanyContextValue {
  const context = useContext(CompanyContext);
  if (context === null) {
    throw new Error("useCompany must be used inside a CompanyProvider");
  }
  return context;
}
