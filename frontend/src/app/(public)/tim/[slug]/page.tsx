import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { OtherTherapistsSection } from "@/components/sections/therapist/other-therapists-section";
import { JsonLd } from "@/components/shared/json-ld";
import { TherapistBioSection } from "@/components/sections/therapist/therapist-bio-section";
import { TherapistContactSection } from "@/components/sections/therapist/therapist-contact-section";
import { TherapistHeroSection } from "@/components/sections/therapist/therapist-hero-section";
import { TherapistServicesSection } from "@/components/sections/therapist/therapist-services-section";
import { getFallbackContent } from "@/content/server";
import {
  jsonLdForEntity,
  metadataForEntity,
} from "@/lib/content-governance/discoverability";
import { getContentProvider } from "@/lib/content-governance/provider-resolver";

interface TherapistPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams(): Promise<{ slug: string }[]> {
  const { therapists } = await getFallbackContent();
  return therapists.map((therapist) => ({ slug: therapist.slug }));
}

export async function generateMetadata({
  params,
}: TherapistPageProps): Promise<Metadata> {
  const { slug } = await params;
  const { therapists } = await getFallbackContent();
  const therapist = therapists.find((candidate) => candidate.slug === slug);

  if (!therapist) {
    return {};
  }
  const entity = (await getContentProvider()).getEntity(
    "therapist",
    `therapist:${therapist.slug}`,
  );
  return entity ? metadataForEntity(entity) : {};
}

export default async function TherapistPage({ params }: TherapistPageProps) {
  const { slug } = await params;
  const { therapists } = await getFallbackContent();
  const provider = await getContentProvider();
  const contentEntity = provider.getEntity("therapist", `therapist:${slug}`);
  const therapist =
    contentEntity?.source ??
    therapists.find((candidate) => candidate.slug === slug);

  if (!therapist) {
    notFound();
  }
  return (
    <>
      {contentEntity ? <JsonLd data={jsonLdForEntity(contentEntity)} /> : null}
      <TherapistHeroSection therapist={therapist} />
      <TherapistBioSection therapist={therapist} />
      <TherapistServicesSection therapist={therapist} />
      <TherapistContactSection therapist={therapist} />
      <OtherTherapistsSection
        others={therapists.filter((candidate) => candidate.slug !== slug)}
      />
    </>
  );
}
