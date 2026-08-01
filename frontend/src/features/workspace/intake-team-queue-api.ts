import type { components } from "@/types/api.generated";

export type IntakeTeamQueueItem = components["schemas"]["TeamQueueItem"];

export async function fetchIntakeTeamQueue(): Promise<IntakeTeamQueueItem[]> {
  const response = await fetch("/api/intake/team-queue", { cache: "no-store" });
  if (!response.ok) {
    throw new Error("Unable to load Intake queue");
  }
  return (await response.json()) as IntakeTeamQueueItem[];
}

export async function claimIntakeCase(caseId: string): Promise<void> {
  const response = await fetch(
    `/api/intake/team-queue/${encodeURIComponent(caseId)}/claim`,
    { method: "POST" },
  );
  if (!response.ok) {
    throw new Error("Unable to claim IntakeCase");
  }
}

export async function reassignIntakeCase(
  caseId: string,
  therapistProfileId: string,
  reasonCode: components["schemas"]["ReassignIntakeCaseRequest"]["reasonCode"],
): Promise<void> {
  const response = await fetch(
    `/api/intake/team-queue/${encodeURIComponent(caseId)}/reassign`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ therapistProfileId, reasonCode }),
    },
  );
  if (!response.ok) {
    throw new Error("Unable to reassign IntakeCase");
  }
}
