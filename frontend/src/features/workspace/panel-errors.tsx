"use client";

import type { PlatformRouteId } from "@/lib/routes/platform-routes";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import type { ReactNode } from "react";

/**
 * Panel-wide error registry.
 *
 * A failed action (a rejected publish, a validation block) must never take the
 * app down. It is recorded here instead, then surfaced three ways:
 *
 * - the Pregled screen lists every open error with a link to the tab that owns it;
 * - the owning tab shows a banner with the name and description;
 * - the nav marks tabs that own an error with a thin red border.
 *
 * In-memory and per-session, matching the rest of the Pre-R2 Control Center
 * preview (D-027). A refresh clears it; the real audit log is a later slice.
 * PanelError is transient UI state, never audit evidence nor a source of
 * truth — the backend validation result stays authoritative (contract A.6).
 */

/**
 * Structured identity of the thing an error is about (contract A.6). The
 * dedup key is the full tuple, so a finding for another revision or another
 * field of the same rule never overwrites this one.
 */
export interface PanelErrorResource {
  organizationId: string;
  resourceType: string;
  resourceId: string;
  revisionId?: string;
  ruleId?: string;
  fieldPath?: string;
}

export interface PanelError {
  id: string;
  /**
   * Route identity of the tab responsible for this error.
   *
   * Was `href: Route` before ROUTE-I18N-2. There is nothing to migrate: this
   * store is in-memory and per-session (a refresh clears it), so "keep the key
   * stable" only ever meant intra-session consistency — which a route id
   * satisfies trivially, and which a path could not once the same screen has
   * two of them.
   */
  routeId: PlatformRouteId;
  /** Label of that tab, shown in the Pregled list. */
  tabLabel: string;
  /** Short name of what went wrong. */
  title: string;
  /** Plain explanation and what to do next. */
  description: string;
  /** Specifics, e.g. which approvals are missing. */
  details: string[];
  /** Present for validation errors; absent for free-form messages. */
  resource?: PanelErrorResource;
  createdAt: string;
}

export type PanelErrorInput = Omit<PanelError, "id" | "createdAt">;

interface PanelErrorsContextValue {
  errors: PanelError[];
  reportError: (error: PanelErrorInput) => void;
  clearError: (id: string) => void;
  clearErrorsFor: (routeId: PlatformRouteId) => void;
  /** Clears only this resource/revision's errors, never the whole tab (A.6). */
  clearErrorsForResource: (resource: PanelErrorResource) => void;
  errorsFor: (routeId: PlatformRouteId) => PanelError[];
  hasErrorFor: (routeId: PlatformRouteId) => boolean;
}

const PanelErrorsContext = createContext<PanelErrorsContextValue | null>(null);

export function resourceKey(resource: PanelErrorResource): string {
  return [
    resource.organizationId,
    resource.resourceType,
    resource.resourceId,
    resource.revisionId ?? "",
    resource.ruleId ?? "",
    resource.fieldPath ?? "",
  ].join("|");
}

function sameResourceRevision(
  a: PanelErrorResource,
  b: PanelErrorResource,
): boolean {
  return (
    a.organizationId === b.organizationId &&
    a.resourceType === b.resourceType &&
    a.resourceId === b.resourceId &&
    (a.revisionId ?? "") === (b.revisionId ?? "")
  );
}

/** Pure helper so the filtering is testable without mounting a provider. */
export function selectErrorsFor(
  errors: PanelError[],
  routeId: PlatformRouteId,
): PanelError[] {
  return errors.filter((error) => error.routeId === routeId);
}

/**
 * Upsert identity (A.6): the structured tuple
 * `organizationId + resourceType + resourceId + revisionId + ruleId +
 * fieldPath` when a resource is present; `routeId + title` remains the fallback
 * only for errors without one. The newest error takes the top position.
 */
export function upsertError(
  errors: PanelError[],
  error: PanelError,
): PanelError[] {
  const rest = errors.filter((existing) => {
    if (error.resource && existing.resource) {
      return resourceKey(existing.resource) !== resourceKey(error.resource);
    }
    if (!error.resource && !existing.resource) {
      return !(
        existing.routeId === error.routeId && existing.title === error.title
      );
    }
    return true;
  });
  return [error, ...rest];
}

/** Pure counterpart of `clearErrorsForResource`, shared with tests. */
export function removeResourceErrors(
  errors: PanelError[],
  resource: PanelErrorResource,
): PanelError[] {
  return errors.filter(
    (error) =>
      error.resource === undefined ||
      !sameResourceRevision(error.resource, resource),
  );
}

export function PanelErrorsProvider({ children }: { children: ReactNode }) {
  const [errors, setErrors] = useState<PanelError[]>([]);

  const reportError = useCallback((input: PanelErrorInput) => {
    setErrors((current) =>
      upsertError(current, {
        ...input,
        id: input.resource
          ? resourceKey(input.resource)
          : `${input.routeId}:${input.title}`,
        createdAt: new Date().toISOString(),
      }),
    );
  }, []);

  const clearError = useCallback((id: string) => {
    setErrors((current) => current.filter((error) => error.id !== id));
  }, []);

  const clearErrorsFor = useCallback((routeId: PlatformRouteId) => {
    setErrors((current) =>
      current.filter((error) => error.routeId !== routeId),
    );
  }, []);

  const clearErrorsForResource = useCallback((resource: PanelErrorResource) => {
    setErrors((current) => removeResourceErrors(current, resource));
  }, []);

  const value = useMemo(
    () => ({
      errors,
      reportError,
      clearError,
      clearErrorsFor,
      clearErrorsForResource,
      errorsFor: (routeId: PlatformRouteId) => selectErrorsFor(errors, routeId),
      hasErrorFor: (routeId: PlatformRouteId) =>
        errors.some((error) => error.routeId === routeId),
    }),
    [errors, reportError, clearError, clearErrorsFor, clearErrorsForResource],
  );

  return (
    <PanelErrorsContext.Provider value={value}>
      {children}
    </PanelErrorsContext.Provider>
  );
}

export function usePanelErrors(): PanelErrorsContextValue {
  const context = useContext(PanelErrorsContext);
  if (context === null) {
    throw new Error("usePanelErrors must be used inside a PanelErrorsProvider");
  }
  return context;
}
