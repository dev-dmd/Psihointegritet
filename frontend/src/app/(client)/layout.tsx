import type { ReactNode } from "react";

import { NextIntlClientProvider } from "next-intl";

import { AccountTopbar } from "@/features/account/components/topbar";
import { getUiLocale } from "@/i18n/locale-boundary";
import { getPlatformMessages } from "@/messages";

/**
 * Chrome for the client account area. Scoped to the (client) group so it never
 * leaks into (public), (auth), or (staff)/(superadmin), which each own their
 * own header.
 *
 * It carries `common` because the topbar renders shared chrome — sign out, back
 * to site — and a subtree without that catalogue throws MISSING_MESSAGE, which
 * is how the superadmin panel broke once already.
 */
export default async function ClientLayout({
  children,
}: {
  children: ReactNode;
}) {
  const { common } = getPlatformMessages(await getUiLocale());

  return (
    <NextIntlClientProvider messages={{ common }}>
      <AccountTopbar />
      {children}
    </NextIntlClientProvider>
  );
}
