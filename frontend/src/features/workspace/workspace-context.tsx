"use client";

import { createContext, useContext, useMemo, useState } from "react";
import type { ReactNode } from "react";

/**
 * Workspace role state. The role flags are computed server-side in the layout
 * (from the real `Identity`, D-026) and passed in — the client never derives
 * authorization, it only mirrors what the server already decided. `selected
 * TherapistSlug` is the admin-only topbar filter ("show me just this
 * therapist's work"); `null` means all therapists.
 */
interface WorkspaceContextValue {
  isAdmin: boolean;
  isTherapist: boolean;
  /** Key into `workspace.roles`; the component renders it. */
  roleLabelKey: ReturnType<typeof roleLabelKeyFor>;
  /** Slug of the therapist the admin is filtering by, or null for all. */
  selectedTherapistSlug: string | null;
  setSelectedTherapistSlug: (slug: string | null) => void;
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

/**
 * Which role label a set of flags resolves to — the key, not the wording.
 *
 * Kept as a pure function so the union-role rule stays unit-testable without a
 * provider; the component turns the key into text.
 */
export function roleLabelKeyFor(
  isAdmin: boolean,
  isTherapist: boolean,
): "adminAndTherapist" | "admin" | "therapist" | "member" {
  if (isAdmin && isTherapist) return "adminAndTherapist";
  if (isAdmin) return "admin";
  if (isTherapist) return "therapist";
  return "member";
}

export function WorkspaceProvider({
  isAdmin,
  isTherapist,
  children,
}: {
  isAdmin: boolean;
  isTherapist: boolean;
  children: ReactNode;
}) {
  const [selectedTherapistSlug, setSelectedTherapistSlug] = useState<
    string | null
  >(null);

  const value = useMemo(
    () => ({
      isAdmin,
      isTherapist,
      roleLabelKey: roleLabelKeyFor(isAdmin, isTherapist),
      selectedTherapistSlug,
      setSelectedTherapistSlug,
    }),
    [isAdmin, isTherapist, selectedTherapistSlug],
  );

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace(): WorkspaceContextValue {
  const context = useContext(WorkspaceContext);
  if (context === null) {
    throw new Error("useWorkspace must be used inside a WorkspaceProvider");
  }
  return context;
}
