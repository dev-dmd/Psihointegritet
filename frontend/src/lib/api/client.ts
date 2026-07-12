import createClient from "openapi-fetch";

import type { paths } from "@/types/api.generated";

const baseUrl = process.env.NEXT_PUBLIC_API_URL;

if (!baseUrl) {
  throw new Error("NEXT_PUBLIC_API_URL is not configured");
}

/**
 * Typed transport for the FastAPI backend. All network access to the backend
 * goes through this client — never through ad hoc fetch calls in UI code.
 */
export const apiClient = createClient<paths>({ baseUrl });
