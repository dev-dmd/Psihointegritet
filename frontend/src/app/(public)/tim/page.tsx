import { TeamCtaSection } from "@/components/sections/team/team-cta-section";
import { TeamIntroSection } from "@/components/sections/team/team-intro-section";
import { TherapistRowsSection } from "@/components/sections/team/therapist-rows-section";
import { metadataForRoute } from "@/lib/content-governance/discoverability";

export const metadata = metadataForRoute("/tim");

export default function TeamPage() {
  return (
    <>
      <TeamIntroSection />
      <TherapistRowsSection />
      <TeamCtaSection />
    </>
  );
}
