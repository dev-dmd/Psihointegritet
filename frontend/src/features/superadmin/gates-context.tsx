"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useReducer,
} from "react";
import type { ReactNode } from "react";

import { initialActivity, initialGates } from "./data";
import type { ActivityItem, FeatureGate } from "./types";

/**
 * In-memory demo state for feature gates + the activity feed (decision
 * D-026): a gate toggle demands a reason and prepends a feed entry
 * (who/when/old→new/reason). Nothing persists — a refresh resets everything;
 * the real registry + Audit Log are backend R6. Mounted in the (superadmin)
 * layout so the Pregled feed reflects toggles made on /superadmin/features.
 */

export interface GatesState {
  gates: FeatureGate[];
  activity: ActivityItem[];
}

export type GatesAction = {
  type: "toggle-gate";
  gateId: string;
  reason: string;
};

export function gatesReducer(
  state: GatesState,
  action: GatesAction,
): GatesState {
  const gate = state.gates.find((item) => item.id === action.gateId);
  // coming_soon gates are locked — no toggle, no feed entry.
  if (!gate || gate.status === "coming_soon") {
    return state;
  }
  const next = gate.status === "on" ? "off" : "on";
  const entry: ActivityItem = {
    title: `${next === "on" ? "Uključen" : "Isključen"} feature gate — ${gate.name}`,
    detail: `upravo · superadmin · razlog: ${action.reason}`,
    kind: "gate",
  };
  return {
    gates: state.gates.map((item) =>
      item.id === gate.id ? { ...item, status: next } : item,
    ),
    activity: [entry, ...state.activity],
  };
}

interface GatesContextValue extends GatesState {
  toggleGate: (gateId: string, reason: string) => void;
}

const GatesContext = createContext<GatesContextValue | null>(null);

export function GatesProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(gatesReducer, {
    gates: initialGates,
    activity: initialActivity,
  });

  const toggleGate = useCallback((gateId: string, reason: string) => {
    dispatch({ type: "toggle-gate", gateId, reason });
  }, []);

  const value = useMemo(() => ({ ...state, toggleGate }), [state, toggleGate]);

  return (
    <GatesContext.Provider value={value}>{children}</GatesContext.Provider>
  );
}

export function useGates(): GatesContextValue {
  const context = useContext(GatesContext);
  if (context === null) {
    throw new Error("useGates must be used inside a GatesProvider");
  }
  return context;
}
