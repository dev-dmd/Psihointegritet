import type { Metadata } from "next";

import { TeamCtaSection } from "@/components/sections/team/team-cta-section";
import { TeamIntroSection } from "@/components/sections/team/team-intro-section";
import { TherapistRowsSection } from "@/components/sections/team/therapist-rows-section";

export const metadata: Metadata = {
  title: "Naš tim",
  description:
    "Upoznajte terapeute Psihointegriteta — pristup, oblasti rada i formati. Geštalt psihoterapija i savetovanje, online i uživo u Nišu i Leskovcu.",
  alternates: { canonical: "/tim" },
};

export default function TeamPage() {
  return (
    <>
      <TeamIntroSection />
      <TherapistRowsSection />
      <TeamCtaSection />
    </>
  );
}
