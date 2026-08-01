/**
 * Superadmin Control Center models (design_handoff_paneli README §13 subset).
 * This phase is mock-data only — the shapes are the contract the future
 * backend (M2.7 diagnostics, R6 gates/billing) fills in.
 */

export type GateStatus = "on" | "off" | "coming_soon";
export type MinPlan = "Core" | "Partner" | "Growth";

export interface FeatureGate {
  id: string;
  name: string;
  description: string;
  status: GateStatus;
  minPlan: MinPlan;
  /** Mono note, e.g. „Ručno uključen · 1. jul" — „—" when none. */
  tenantOverride: string;
}

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  domain: string;
  owner: string;
  plan: string;
  status: "active";
  trial: string;
  therapists: number;
  clients: number;
  appointments: number;
  created: string;
  lastActivity: string;
  engines: string[];
  /** Interna beleška — superadmin only. */
  note: string;
}

export interface PlatformStat {
  value: string;
  label: string;
  dot: "meadow" | "warm" | "danger";
}

export type ServiceStatus = "op" | "deg" | "down";

export interface HealthService {
  name: string;
  meta: string;
  status: ServiceStatus;
}

export interface UsageTile {
  value: string;
  label: string;
}

export type ActivityKind = "err" | "gate" | "sys" | "ok";

export interface ActivityItem {
  title: string;
  detail: string;
  kind: ActivityKind;
}

/** Audit entry shape (README §13) — records who/what/old→new/reason/when. */
export interface AuditEntry {
  actor: string;
  action: string;
  tenantId: string;
  previous: string;
  next: string;
  reason: string;
  at: string;
}
