import { SiteFooter } from "@/components/sections/site-footer";
import { SiteHeader } from "@/components/sections/site-header";
import { CompanyProvider } from "@/features/company/company-context";
import { GuidanceProvider } from "@/features/guidance/guidance-context";
import { ResearchProvider } from "@/features/research/research-context";

/**
 * Chrome shared by every public page: header, footer, the guided-selection
 * drawer (kept during the route migration), the research survey (the floating
 * „?") and the B2B configurator. The providers share the public shell but do
 * not couple guided matching to the company inquiry flow. Scoped to the (public) group so
 * the marketing chrome never leaks into (auth), (client) or (staff).
 */
export default function PublicLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <CompanyProvider>
      <GuidanceProvider>
        <ResearchProvider>
          <SiteHeader />
          <main>{children}</main>
          <SiteFooter />
        </ResearchProvider>
      </GuidanceProvider>
    </CompanyProvider>
  );
}
