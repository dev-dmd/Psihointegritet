import type { Metadata } from "next";

import { ScreenUsluge } from "@/features/workspace/components/screen-usluge";
import { requireOrgAdmin } from "@/lib/auth/guards";

export const metadata: Metadata = { title: "Usluge i cene" };

export default async function WorkspaceServicesPage() {
  await requireOrgAdmin();
  return <ScreenUsluge />;
}
