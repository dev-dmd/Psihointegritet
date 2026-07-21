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
  openCompany: () => void;
}

const CompanyContext = createContext<CompanyContextValue | null>(null);

/**
 * Owns the B2B configurator drawer for the public area. Opened from the
 * „Rad sa kompanijama" page CTA and from the matching drawer's B2B branch.
 * Wraps the other public providers so the matching drawer can open it directly.
 * Mounted only while open, so every run starts fresh (no answers persist).
 */
export function CompanyProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);

  const openCompany = useCallback(() => setOpen(true), []);
  const closeCompany = useCallback(() => setOpen(false), []);

  const value = useMemo(() => ({ openCompany }), [openCompany]);

  return (
    <CompanyContext.Provider value={value}>
      {children}
      {open ? <CompanyConfiguratorDrawer onClose={closeCompany} /> : null}
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
