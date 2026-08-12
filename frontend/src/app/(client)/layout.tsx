import type { Metadata } from "next";
import type { ReactNode } from "react";

import { NextIntlClientProvider } from "next-intl";

import { AccountBottomNav } from "@/features/account/components/bottom-nav";
import { AccountTopbar } from "@/features/account/components/topbar";
import { requireClient } from "@/lib/auth/guards";
import { resolveWorkspaceLocale } from "@/lib/tenant/workspace-locale";
import { getPlatformMessages } from "@/messages";
import { QueryProvider } from "@/providers/query-provider";

export const metadata: Metadata = {
  title: { default: "Moj panel", template: "%s · Psihointegritet" },
  robots: { index: false, follow: false },
};

/**
 * Client panel shell („Psihointegritet Klijent Panel" handoff): one 480px app
 * column, sticky header, four-tab bottom navigation.
 *
 * The column keeps its width at every viewport rather than growing into a
 * desktop layout. The handoff draws exactly one surface — a phone-width card
 * centred on the canvas — and inventing a wide version would mean inventing
 * content to fill it. It reads the same on a phone and on a laptop.
 *
 * The layout guard is the outer wall only; every page below still calls
 * `requireClient()` itself, because layouts do not re-run on soft navigation
 * (rules §11, D-026).
 */
export default async function ClientLayout({
  children,
}: {
  children: ReactNode;
}) {
  await requireClient();

  // The client panel is a tenant surface, so it follows the organization's
  // `ui_locale` — never a personal choice, never the public content locale.
  const locale = await resolveWorkspaceLocale();
  const { account, common } = getPlatformMessages(locale);

  return (
    <NextIntlClientProvider locale={locale} messages={{ account, common }}>
      <QueryProvider>
        <div className="bg-canvas flex min-h-screen justify-center">
          <div className="bg-panel-canvas relative flex min-h-screen w-full max-w-[480px] flex-col shadow-[0_30px_80px_-30px_rgba(58,46,40,0.35)]">
            <AccountTopbar />
            <main className="flex-1 px-[22px] pt-[22px] pb-8">{children}</main>
            <AccountBottomNav />
          </div>
        </div>
      </QueryProvider>
    </NextIntlClientProvider>
  );
}
