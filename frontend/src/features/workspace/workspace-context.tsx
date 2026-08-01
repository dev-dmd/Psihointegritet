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
  roleLabel: string;
  /** Slug of the therapist the admin is filtering by, or null for all. */
  selectedTherapistSlug: string | null;
  setSelectedTherapistSlug: (slug: string | null) => void;
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export function roleLabelFor(isAdmin: boolean, isTherapist: boolean): string {
  if (isAdmin && isTherapist) return "Administrator i terapeut";
  if (isAdmin) return "Administrator centra";
  if (isTherapist) return "Terapeut";
  return "Član tima";
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
      roleLabel: roleLabelFor(isAdmin, isTherapist),
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
