import type { Metadata } from "next";
import type { ReactNode } from "react";

import { NextIntlClientProvider } from "next-intl";

import { resolveWorkspaceLocale } from "@/lib/tenant/workspace-locale";
import { getPlatformMessages } from "@/messages";
import { requireSuperadmin } from "@/lib/auth/guards";
import { SuperadminBottomNav } from "@/features/superadmin/components/bottom-nav";
import { SuperadminSidebar } from "@/features/superadmin/components/sidebar";
import { SuperadminTopbar } from "@/features/superadmin/components/topbar";
import { GatesProvider } from "@/features/superadmin/gates-context";
import { QueryProvider } from "@/providers/query-provider";

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

  // Superadmin sees the deployment's locale today. Per D-077 Amendment 2 the
  // superadmin picks their **own** platform language — a per-user preference,
  // the one documented exception to "no per-user override", because superadmin
  // is not a tenant surface and has no organization to inherit from. That needs
  // storage on the user and its own resolver; this is the seam it replaces.
  //
  // TODO(superadmin-locale): swap this for the personal preference
  // when it lands. Nothing else here changes.
  // Until the personal preference is stored, an operator sees this
  // deployment's `ui_locale`. The resolver treats a superadmin's empty
  // membership list as normal, so it does not trip the mismatch guard.
  const locale = await resolveWorkspaceLocale();
  const { workspace, superadmin, common } = getPlatformMessages(locale);

  return (
    <NextIntlClientProvider
      locale={locale}
      messages={{ workspace, superadmin, common }}
    >
      <QueryProvider>
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
      </QueryProvider>
    </NextIntlClientProvider>
  );
}
