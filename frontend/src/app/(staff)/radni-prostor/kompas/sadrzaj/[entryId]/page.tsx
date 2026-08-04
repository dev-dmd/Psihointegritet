import type { Metadata } from "next";

import { KompasArticleScreen } from "@/features/workspace/components/kompas-sadrzaj/kompas-article-screen";
import { requireOrgAdmin } from "@/lib/auth/guards";

export const metadata: Metadata = {
  title: "Uređivanje teksta",
  robots: { index: false, follow: false },
};

/**
 * The article gets a page of its own, not a panel under a catalogue — an
 * author who opened a text should be looking at that text (D-063).
 */
export default async function KompasArticlePage({
  params,
}: {
  params: Promise<{ entryId: string }>;
}) {
  await requireOrgAdmin();
  const { entryId } = await params;
  return <KompasArticleScreen entryId={entryId} />;
}
