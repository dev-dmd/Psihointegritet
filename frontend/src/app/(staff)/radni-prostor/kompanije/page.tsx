import type { Metadata } from "next";

import { ScreenKompanije } from "@/features/workspace/components/screen-kompanije";
import { requireOrgAdmin } from "@/lib/auth/guards";

export const metadata: Metadata = { title: "Kompanije" };

export default async function WorkspaceCompaniesPage() {
  await requireOrgAdmin();
  return <ScreenKompanije />;
}
