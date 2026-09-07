import { sanjaDisplay } from "@/features/tenants/sanja-neuer/fonts";
import { SanjaLandingShell } from "@/features/tenants/sanja-neuer/landing-shell";
import { SanjaBio } from "@/features/tenants/sanja-neuer/sections/bio";
import { SanjaCtaBand } from "@/features/tenants/sanja-neuer/sections/cta-band";
import { SanjaFaq } from "@/features/tenants/sanja-neuer/sections/faq";
import { SanjaFrameworks } from "@/features/tenants/sanja-neuer/sections/frameworks";
import { SanjaHero } from "@/features/tenants/sanja-neuer/sections/hero";
import { SanjaMethodology } from "@/features/tenants/sanja-neuer/sections/methodology";
import { SanjaProcess } from "@/features/tenants/sanja-neuer/sections/process";
import { SanjaServices } from "@/features/tenants/sanja-neuer/sections/services";
import { SanjaStats } from "@/features/tenants/sanja-neuer/sections/stats";
import { SanjaVideoBlog } from "@/features/tenants/sanja-neuer/sections/video-blog";
import { SanjaFooter } from "@/features/tenants/sanja-neuer/layout/site-footer";

/**
 * Sanja Neuer's landing page, in the order the design lays it out.
 *
 * The tenant's palette and display face are scoped to this element rather than
 * applied globally: `sn-*` tokens exist platform-wide as *values*, but only this
 * subtree carries the font variable, so no other tenant's page downloads
 * Playfair or inherits her ground colour.
 *
 * `overflow-x-hidden` is load-bearing. Three sections park decorative strips
 * just outside their container, and without this the page gains a horizontal
 * scrollbar on narrow phones — the failure the handoff asks to verify at 360px.
 */
export function SanjaLandingPage() {
  return (
    <div
      className={`${sanjaDisplay.variable} bg-sn-ivory text-sn-ink min-h-screen overflow-x-hidden scroll-smooth`}
    >
      <SanjaLandingShell>
        <main>
          <SanjaHero />
          <SanjaStats />
          <SanjaBio />
          <SanjaFrameworks />
          <SanjaMethodology />
          <SanjaServices />
          <SanjaProcess />
          <SanjaVideoBlog />
          <SanjaFaq />
          <SanjaCtaBand />
        </main>
        <SanjaFooter />
      </SanjaLandingShell>
    </div>
  );
}
