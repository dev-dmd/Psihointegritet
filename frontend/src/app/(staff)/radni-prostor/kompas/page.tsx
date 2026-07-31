import type { Metadata } from "next";

import { ScreenKompas } from "@/features/workspace/components/screen-kompas";
import { requireOrgAdmin } from "@/lib/auth/guards";

export const metadata: Metadata = { title: "Kompas" };

export default async function WorkspaceCompassPage() {
  await requireOrgAdmin();
  return <ScreenKompas />;
}
