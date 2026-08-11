import type { Metadata } from "next";

import { ScreenDostupnost } from "@/features/workspace/components/availability/screen-dostupnost";
import { requireTherapist } from "@/lib/auth/guards";

export const metadata: Metadata = { title: "Dostupnost" };

/**
 * Tab state lives in `?tab=` so a link can point straight at one layer and the
 * choice survives a refresh (design handoff §2).
 */
export default async function WorkspaceAvailabilityPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  await requireTherapist();
  const params = await searchParams;
  return <ScreenDostupnost initialTab={params.tab ?? null} />;
}
