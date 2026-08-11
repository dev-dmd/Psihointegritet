import type { Metadata } from "next";

import { KompasContentNew } from "@/features/workspace/components/kompas-sadrzaj/kompas-content-new";
import { requireOrgAdmin } from "@/lib/auth/guards";

export const metadata: Metadata = { title: "Novi Kompas sadržaj" };

export default async function KompasContentNewPage() {
  await requireOrgAdmin();
  return <KompasContentNew />;
}
