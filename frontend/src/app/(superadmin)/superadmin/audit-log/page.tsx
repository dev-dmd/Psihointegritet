import type { Metadata } from "next";

import { ComingSoonSection } from "@/features/superadmin/components/coming-soon-section";
import { requireSuperadmin } from "@/lib/auth/guards";

export const metadata: Metadata = { title: "Audit Log" };

export default async function SuperadminAuditLogPage() {
  await requireSuperadmin();

  return <ComingSoonSection />;
}
