import { isApiProblem } from "@/lib/errors/api-problem";
import type { components } from "@/types/api.generated";

export type CompassFlowVersion = components["schemas"]["CompassFlowVersionOut"];
export type CompassFlowDefinition =
  components["schemas"]["CompassFlowDefinition"];
export type AdminFlowPreview = components["schemas"]["AdminFlowPreviewOut"];

async function parse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    // The backend answers with the shared problem envelope, where the human
    // sentence is `title` (`api/errors.py` puts a string detail there, and a
    // structured detail's `message` too). Reading `detail.message` instead —
    // as this client first did — silently reduced every explained refusal to
    // "Kompas zahtev nije uspeo (403)".
    const payload: unknown = await response.json().catch(() => null);
    const message = isApiProblem(payload)
      ? (payload.detail ?? payload.title)
      : null;
    throw new Error(
      message ?? `Kompas zahtev nije uspeo (${response.status}).`,
    );
  }
  return (await response.json()) as T;
}

export async function fetchCompassFlows(): Promise<CompassFlowVersion[]> {
  return parse(await fetch("/api/compass/admin/flows", { cache: "no-store" }));
}

export async function createCompassFlow(definition: CompassFlowDefinition) {
  return parse<CompassFlowVersion>(
    await fetch("/api/compass/admin/flows", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        stableId: "main-kompas",
        locale: "sr-Latn",
        definition,
      }),
    }),
  );
}

function versionPath(flow: CompassFlowVersion, suffix = "") {
  return `/api/compass/admin/flows/${flow.flowId}/versions/${flow.versionId}${suffix}`;
}

export async function updateCompassFlow(
  flow: CompassFlowVersion,
  definition: CompassFlowDefinition,
) {
  return parse<CompassFlowVersion>(
    await fetch(versionPath(flow), {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lockVersion: flow.lockVersion, definition }),
    }),
  );
}

export async function transitionCompassFlow(
  flow: CompassFlowVersion,
  target: components["schemas"]["RevisionStatus"],
) {
  return parse<CompassFlowVersion>(
    await fetch(versionPath(flow, "/transition"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lockVersion: flow.lockVersion, target }),
    }),
  );
}

export async function reviewCompassFlow(
  flow: CompassFlowVersion,
  capability: "clinical" | "business",
) {
  return parse<CompassFlowVersion>(
    await fetch(versionPath(flow, "/reviews"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ capability, outcome: "approved" }),
    }),
  );
}

export async function previewCompassFlow(flow: CompassFlowVersion) {
  return parse<AdminFlowPreview>(
    await fetch(versionPath(flow, "/preview"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answers: [] }),
    }),
  );
}
