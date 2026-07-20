import type { Metadata } from "next";

import { ScreenTerapeuti } from "@/features/workspace/components/screen-terapeuti";
import { requireOrgAdmin } from "@/lib/auth/guards";

export const metadata: Metadata = { title: "Terapeuti" };

export default async function WorkspaceTherapistsPage() {
  await requireOrgAdmin();
  return <ScreenTerapeuti />;
}
