import type { Metadata } from "next";

import { ScreenSadrzaj } from "@/features/workspace/components/screen-sadrzaj";
import { requireOrgAdmin } from "@/lib/auth/guards";

export const metadata: Metadata = { title: "Sadržaj" };

export default async function WorkspaceContentPage() {
  await requireOrgAdmin();
  return <ScreenSadrzaj />;
}
