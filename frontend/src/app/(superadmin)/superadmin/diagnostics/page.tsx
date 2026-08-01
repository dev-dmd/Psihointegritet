import type { Metadata } from "next";

import { DiagnosticsView } from "@/features/superadmin/components/diagnostics-view";
import { requireSuperadmin } from "@/lib/auth/guards";

export const metadata: Metadata = { title: "Dijagnostika" };

export default async function SuperadminDiagnosticsPage() {
  await requireSuperadmin();

  return (
    <section className="animate-fade-up">
      <DiagnosticsView />
    </section>
  );
}
