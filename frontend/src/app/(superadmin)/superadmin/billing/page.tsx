import type { Metadata } from "next";

import { ComingSoonSection } from "@/features/superadmin/components/coming-soon-section";
import { requireSuperadmin } from "@/lib/auth/guards";

export const metadata: Metadata = { title: "Pretplate" };

export default async function SuperadminBillingPage() {
  await requireSuperadmin();

  return <ComingSoonSection />;
}
