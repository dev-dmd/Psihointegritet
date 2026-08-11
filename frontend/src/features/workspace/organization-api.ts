import type { UiLocale } from "@/i18n/locales";

/** Organization settings as the BFF returns them (D-077). */
export interface OrganizationSettings {
  id: string;
  slug: string;
  displayName: string;
  uiLocale: UiLocale;
  defaultContentLocale: UiLocale;
}

export interface OrganizationApiProblem {
  code: string;
  message?: string;
}

export class OrganizationApiError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "OrganizationApiError";
  }
}

async function parseProblem(response: Response): Promise<never> {
  // The backend returns a code; the words are chosen here (TODO §5G rule 1).
  const problem = (await response
    .json()
    .catch(() => null)) as OrganizationApiProblem | null;
  throw new OrganizationApiError(
    problem?.code ?? "http_error",
    problem?.message ?? "",
  );
}

export async function fetchOrganizationSettings(): Promise<OrganizationSettings> {
  const response = await fetch("/api/organizations/me", { cache: "no-store" });
  if (!response.ok) return parseProblem(response);
  return (await response.json()) as OrganizationSettings;
}

export async function updateOrganizationLocales(input: {
  uiLocale: UiLocale;
  defaultContentLocale: UiLocale;
}): Promise<OrganizationSettings> {
  const response = await fetch("/api/organizations/me/locales", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) return parseProblem(response);
  return (await response.json()) as OrganizationSettings;
}
