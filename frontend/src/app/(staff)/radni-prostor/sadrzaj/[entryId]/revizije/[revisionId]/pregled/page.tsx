import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ContentRevisionPreview } from "@/features/workspace/components/content-revision-preview";
import { requireOrgAdmin } from "@/lib/auth/guards";
import { getStaffContentPreview } from "@/lib/content-governance/staff-preview";

export const metadata: Metadata = {
  title: "Pregled revizije",
  robots: { index: false, follow: false },
};

interface PreviewPageProps {
  params: Promise<{ entryId: string; revisionId: string }>;
}

export default async function ContentRevisionPreviewPage({
  params,
}: PreviewPageProps) {
  await requireOrgAdmin();
  const { entryId, revisionId } = await params;
  const revision = await getStaffContentPreview(entryId, revisionId);
  if (!revision) notFound();
  return <ContentRevisionPreview revision={revision} />;
}
