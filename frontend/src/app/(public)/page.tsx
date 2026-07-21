import { Faq } from "@/components/sections/faq";
import { FinalCta } from "@/components/sections/final-cta";
import { FirstSession } from "@/components/sections/first-session";
import { Hero } from "@/components/sections/hero";
import { Reasons } from "@/components/sections/reasons";
import { Resources } from "@/components/sections/resources";
import { Services } from "@/components/sections/services";
import { SupportPaths } from "@/components/sections/support-paths";
import { Therapists } from "@/components/sections/therapists";
import { TrustStrip } from "@/components/sections/trust-strip";
import { Workshop } from "@/components/sections/workshop";
import { JsonLd } from "@/components/shared/json-ld";
import {
  jsonLdForRoute,
  metadataForRoute,
} from "@/lib/content-governance/discoverability";

export const metadata = metadataForRoute("/");

/** Public homepage — Server Component composition of the Claude Design handoff. */
export default function HomePage() {
  return (
    <>
      <JsonLd data={jsonLdForRoute("/")} />
      <Hero />
      <TrustStrip />
      <Reasons />
      <SupportPaths />
      <Therapists />
      <Services />
      <FirstSession />
      <Workshop />
      <Resources />
      <Faq />
      <FinalCta />
    </>
  );
}
