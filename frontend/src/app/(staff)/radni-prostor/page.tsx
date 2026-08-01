import { ScreenPregled } from "@/features/workspace/components/screen-pregled";
import { requireStaff } from "@/lib/auth/guards";

/** Pregled — greeting, priority cards, today's agenda, week occupancy. */
export default async function WorkspaceOverviewPage() {
  await requireStaff();
  return <ScreenPregled />;
}
