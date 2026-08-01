import type { ReactNode } from "react";

import { AccountTopbar } from "@/features/account/components/topbar";

/**
 * Chrome for the client account area (`/nalog`). Scoped to the (client)
 * group so it never leaks into (public), (auth), or (staff)/(superadmin),
 * which each own their own header.
 */
export default function ClientLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <AccountTopbar />
      {children}
    </>
  );
}
