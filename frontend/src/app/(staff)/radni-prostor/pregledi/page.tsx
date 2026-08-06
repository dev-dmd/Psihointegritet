import type { Metadata } from "next";

import { ReviewQueueScreen } from "@/features/workspace/components/review-queue-screen";
import { requireOrgAdmin } from "@/lib/auth/guards";

export const metadata: Metadata = { title: "Pregledi" };

export default async function ReviewQueuePage() {
  await requireOrgAdmin();
  return <ReviewQueueScreen />;
}
