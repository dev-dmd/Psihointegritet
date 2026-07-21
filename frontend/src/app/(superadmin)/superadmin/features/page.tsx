import type { Metadata } from "next";

import { GatesTable } from "@/features/superadmin/components/gates-table";
import { PageHeader } from "@/features/superadmin/components/page-header";
import { requireSuperadmin } from "@/lib/auth/guards";

export const metadata: Metadata = { title: "Feature Gates" };

export default async function SuperadminFeaturesPage() {
  await requireSuperadmin();

  return (
    <section className="animate-fade-up">
      <PageHeader
        title="Feature Gates"
        description="Registar funkcionalnosti po tenantu — osnova budućih planova i white-label ponude. Svaka promena zahteva razlog i upisuje se u Audit Log."
      />
      <GatesTable />
    </section>
  );
}
