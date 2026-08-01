import type { Metadata } from "next";

import { ScreenIstrazivanja } from "@/features/workspace/components/screen-istrazivanja";
import { requireOrgAdmin } from "@/lib/auth/guards";

export const metadata: Metadata = { title: "Istraživanja" };

export default async function WorkspaceResearchPage() {
  await requireOrgAdmin();
  return <ScreenIstrazivanja />;
}
