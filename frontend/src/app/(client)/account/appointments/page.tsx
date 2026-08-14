import type { Metadata } from "next";

import { ScreenTermini } from "@/features/account/components/screen-termini";
import { requireClient } from "@/lib/auth/guards";
import { resolveWorkspaceLocale } from "@/lib/tenant/workspace-locale";
import { getPlatformMessages } from "@/messages";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await resolveWorkspaceLocale();
  return { title: getPlatformMessages(locale).account.metadata.appointments };
}

/** KP 02 „Moji termini" — the client's own booking requests. */
export default async function ClientAppointmentsPage() {
  await requireClient();
  return <ScreenTermini />;
}
