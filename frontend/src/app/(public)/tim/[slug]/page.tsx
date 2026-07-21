import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { OtherTherapistsSection } from "@/components/sections/therapist/other-therapists-section";
import { JsonLd } from "@/components/shared/json-ld";
import { TherapistBioSection } from "@/components/sections/therapist/therapist-bio-section";
import { TherapistContactSection } from "@/components/sections/therapist/therapist-contact-section";
import { TherapistHeroSection } from "@/components/sections/therapist/therapist-hero-section";
import { TherapistServicesSection } from "@/components/sections/therapist/therapist-services-section";
import {
  findTherapist,
  otherTherapists,
  therapists,
} from "@/content/therapists";
import {
  jsonLdForEntity,
  metadataForEntity,
} from "@/lib/content-governance/discoverability";
import { staticContentProvider } from "@/lib/content-governance/static-provider";

interface TherapistPageProps {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams(): { slug: string }[] {
  return therapists.map((therapist) => ({ slug: therapist.slug }));
}

export async function generateMetadata({
  params,
}: TherapistPageProps): Promise<Metadata> {
  const { slug } = await params;
  const therapist = findTherapist(slug);

  if (!therapist) {
    return {};
  }
  const entity = staticContentProvider.getEntity(
    "therapist",
    `therapist:${therapist.slug}`,
  );
  return entity ? metadataForEntity(entity) : {};
}

export default async function TherapistPage({ params }: TherapistPageProps) {
  const { slug } = await params;
  const therapist = findTherapist(slug);

  if (!therapist) {
    notFound();
  }
  const contentEntity = staticContentProvider.getEntity(
    "therapist",
    `therapist:${therapist.slug}`,
  );

  return (
    <>
      {contentEntity ? <JsonLd data={jsonLdForEntity(contentEntity)} /> : null}
      <TherapistHeroSection therapist={therapist} />
      <TherapistBioSection therapist={therapist} />
      <TherapistServicesSection therapist={therapist} />
      <TherapistContactSection therapist={therapist} />
      <OtherTherapistsSection others={otherTherapists(slug)} />
    </>
  );
}
