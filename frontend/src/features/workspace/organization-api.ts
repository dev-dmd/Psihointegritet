import type { UiLocale } from "@/i18n/locales";
import { parseJsonResponse } from "@/lib/api/request-json";

/** Organization settings as the BFF returns them (D-077). */
export interface OrganizationSettings {
  id: string;
  slug: string;
  displayName: string;
  uiLocale: UiLocale;
  defaultContentLocale: UiLocale;
}

export async function fetchOrganizationSettings(): Promise<OrganizationSettings> {
  const response = await fetch("/api/organizations/me", { cache: "no-store" });
  return parseJsonResponse<OrganizationSettings>(response);
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
  return parseJsonResponse<OrganizationSettings>(response);
}
