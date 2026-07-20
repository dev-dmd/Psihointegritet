import type { Metadata } from "next";
import type { ReactNode } from "react";

import { requireSuperadmin } from "@/lib/auth/guards";
import { SuperadminBottomNav } from "@/features/superadmin/components/bottom-nav";
import { SuperadminSidebar } from "@/features/superadmin/components/sidebar";
import { SuperadminTopbar } from "@/features/superadmin/components/topbar";
import { GatesProvider } from "@/features/superadmin/gates-context";

export const metadata: Metadata = {
  title: { default: "Superadmin", template: "%s · Superadmin" },
  robots: { index: false, follow: false },
};

/**
 * Superadmin Control Center shell (design handoff `design_handoff_paneli/`):
 * fixed coffee sidebar (desktop), sticky blurred topbar, mobile bottom nav,
 * 1160px content column. GatesProvider lives here so the demo gate toggles on
 * /superadmin/features show up in the Pregled activity feed (in-memory only).
 *
 * The layout guard is the outer wall, but it is NOT the only one: layouts do
 * not re-run on soft navigation, so every page under this segment calls
 * `requireSuperadmin()` again (D-026 — nav hiding is never authorization).
 */
export default async function SuperadminLayout({
  children,
}: {
  children: ReactNode;
}) {
  await requireSuperadmin();

  return (
    <GatesProvider>
      <div className="bg-panel-canvas flex min-h-screen">
        <SuperadminSidebar />
        <div className="flex min-w-0 flex-1 flex-col lg:ml-[264px]">
          <SuperadminTopbar />
          <main className="w-full max-w-[1160px] self-center px-4 pt-[30px] pb-[104px] md:px-8 lg:pb-14">
            {children}
          </main>
        </div>
        <SuperadminBottomNav />
      </div>
    </GatesProvider>
  );
}
