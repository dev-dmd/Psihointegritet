import type { Metadata } from "next";

import { ScreenTermini } from "@/features/account/components/screen-termini";
import { requireClient } from "@/lib/auth/guards";

export const metadata: Metadata = { title: "Moji termini" };

/** KP 02 „Moji termini" — the client's own booking requests. */
export default async function ClientAppointmentsPage() {
  await requireClient();
  return <ScreenTermini />;
}
