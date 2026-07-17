import { SiteFooter } from "@/components/sections/site-footer";
import { SiteHeader } from "@/components/sections/site-header";
import { GuidanceProvider } from "@/features/guidance/guidance-context";

/**
 * Chrome shared by every public page: header, footer and the guided-selection
 * drawer. Scoped to the (public) group so the marketing chrome never leaks into
 * (auth), (client) or (staff).
 */
export default function PublicLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <GuidanceProvider>
      <SiteHeader />
      <main>{children}</main>
      <SiteFooter />
    </GuidanceProvider>
  );
}
