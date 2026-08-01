import type { Metadata } from "next";

import { ScreenPodesavanja } from "@/features/workspace/components/screen-podesavanja";
import { requireOrgAdmin } from "@/lib/auth/guards";

export const metadata: Metadata = { title: "Podešavanja" };

export default async function WorkspaceSettingsPage() {
  await requireOrgAdmin();
  return <ScreenPodesavanja />;
}
