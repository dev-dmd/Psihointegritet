import type { Metadata } from "next";

import { ScreenKompas } from "@/features/workspace/components/screen-kompas/screen-kompas";
import { requireOrgAdmin } from "@/lib/auth/guards";

export const metadata: Metadata = { title: "Kompas" };

export default async function WorkspaceCompassPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  await requireOrgAdmin();
  const params = await searchParams;
  return <ScreenKompas initialTab={params.tab ?? null} />;
}
