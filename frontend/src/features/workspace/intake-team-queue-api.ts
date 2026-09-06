import { parseJsonResponse } from "@/lib/api/request-json";
import type { components } from "@/types/api.generated";

export type IntakeTeamQueueItem = components["schemas"]["TeamQueueItem"];

export async function fetchIntakeTeamQueue(): Promise<IntakeTeamQueueItem[]> {
  const response = await fetch("/api/intake/team-queue", { cache: "no-store" });
  return parseJsonResponse<IntakeTeamQueueItem[]>(response);
}

export async function claimIntakeCase(caseId: string): Promise<void> {
  const response = await fetch(
    `/api/intake/team-queue/${encodeURIComponent(caseId)}/claim`,
    { method: "POST" },
  );
  await parseJsonResponse<void>(response);
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
  await parseJsonResponse<void>(response);
}
