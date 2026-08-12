"use client";

import { useTranslations } from "next-intl";

import type { WorkspaceStatus } from "./types";

/**
 * The words for `STATUS_META`.
 *
 * A hook rather than a lookup table because the catalogue is only reachable
 * through the provider, and every screen showing a status badge is already a
 * Client Component below it.
 */
export function useStatusLabel(): (status: WorkspaceStatus) => string {
  const t = useTranslations("screens.status");
  return (status) => t(status);
}
