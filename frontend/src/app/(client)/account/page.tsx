import { ScreenPocetna } from "@/features/account/components/screen-pocetna";
import { firstNameOf } from "@/features/account/identity-display";
import { requireClient } from "@/lib/auth/guards";

/**
 * KP 01 „Početna" — the client panel's home screen, and the landing page Clerk
 * sends every direct sign-in to (`signInFallbackRedirectUrl`).
 *
 * That URL is a single static string with no role awareness, so staff and
 * superadmins arrive here too; `requireClient` bounces them to their own area
 * before anything renders. Visitors who asked for a specific protected route
 * skip this entirely via proxy.ts's `redirect_url`.
 */
export default async function ClientDashboardPage() {
  const identity = await requireClient();
  return <ScreenPocetna firstName={firstNameOf(identity)} />;
}
