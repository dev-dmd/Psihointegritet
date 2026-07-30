import { TeamCtaSection } from "@/components/sections/team/team-cta-section";
import { TeamIntroSection } from "@/components/sections/team/team-intro-section";
import { TherapistRowsSection } from "@/components/sections/team/therapist-rows-section";
import { metadataForRoute } from "@/lib/content-governance/discoverability";
import { getContentProvider } from "@/lib/content-governance/provider-resolver";

export async function generateMetadata() {
  return metadataForRoute("/tim", await getContentProvider());
}

export default async function TeamPage() {
  const therapists = (await getContentProvider())
    .listAll()
    .filter((entity) => entity.type === "therapist")
    .map((entity) => entity.source);
  return (
    <>
      <TeamIntroSection />
      <TherapistRowsSection items={therapists} />
      <TeamCtaSection />
    </>
  );
}
