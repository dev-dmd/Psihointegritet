import type { Metadata } from "next";

import { ScreenDokumenti } from "@/features/workspace/components/screen-dokumenti/screen-dokumenti";
import { requireOrgAdmin } from "@/lib/auth/guards";

export const metadata: Metadata = { title: "Dokumenti i saglasnosti" };

export default async function WorkspaceDocumentsPage() {
  await requireOrgAdmin();
  return <ScreenDokumenti />;
}
