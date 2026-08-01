import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { RichText } from "@/components/content/rich-text";
import { PageHero } from "@/components/shared/page-hero";
import { Eyebrow } from "@/components/ui/eyebrow";
import { fetchPublicCustomDocument } from "@/lib/privacy/public-legal-document";

interface CustomDocumentPageProps {
  params: Promise<{ documentSlug: string }>;
}

export async function generateMetadata({
  params,
}: CustomDocumentPageProps): Promise<Metadata> {
  const { documentSlug } = await params;
  const document = await fetchPublicCustomDocument(documentSlug);
  if (!document) return {};

  return {
    title: document.title,
    alternates: { canonical: `/${document.slug}` },
    robots: { index: false, follow: false },
    openGraph: {
      title: document.title,
      url: `/${document.slug}`,
      type: "article",
    },
  };
}

export default async function CustomDocumentPage({
  params,
}: CustomDocumentPageProps) {
  const { documentSlug } = await params;
  const document = await fetchPublicCustomDocument(documentSlug);
  if (!document || document.kind !== "custom_document") notFound();

  return (
    <>
      <PageHero id="dokument">
        <div className="max-w-[720px]">
          <Eyebrow className="mb-4">Dokument i saglasnost</Eyebrow>
          <h1 className="text-forest mb-[18px] font-serif text-[clamp(28px,7.5vw,40px)] leading-[1.08] font-normal tracking-[-0.015em] text-pretty md:text-[44px]">
            {document.title}
          </h1>
          <p className="text-coffee/55 text-[13px]">
            Verzija {document.versionLabel}
            {document.publishedAt
              ? ` · objavljeno ${new Date(document.publishedAt).toLocaleDateString("sr-Latn-RS")}`
              : ""}
          </p>
        </div>
      </PageHero>
      <section className="pt-[56px] pb-[80px] md:pt-16 md:pb-24">
        <div className="mx-auto max-w-[760px] px-5 md:px-8">
          <RichText doc={document.body} />
        </div>
      </section>
    </>
  );
}
