import type { Metadata } from "next";

import { ScreenTermini } from "@/features/workspace/components/screen-termini";
import { requireStaff } from "@/lib/auth/guards";

export const metadata: Metadata = { title: "Termini" };

export default async function WorkspaceAppointmentsPage() {
  await requireStaff();
  return <ScreenTermini />;
}
