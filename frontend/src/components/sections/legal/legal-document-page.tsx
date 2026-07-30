import { RichText } from "@/components/content/rich-text";
import { PageHero } from "@/components/shared/page-hero";
import { Eyebrow } from "@/components/ui/eyebrow";
import { siteSettings } from "@/content/site-settings";
import {
  fetchPublicLegalDocument,
  type PublicLegalDocumentKind,
} from "@/lib/privacy/public-legal-document";

/**
 * Shared shell for the four legal pages (`/privatnost`, `/uslovi`,
 * `/kolacici`, `/pravila-zakazivanja`). D-038's CMS-fallback pattern, but
 * with a twist specific to legal text: there is no *code* fallback to fall
 * back to — MP §0 point 8 forbids writing legal text ourselves — so the
 * fallback is an explicit "pending legal confirmation" notice (S5), exactly
 * the placeholder `TODO.md` §5 R1.1 already specified before any of this
 * existed, not new copy invented here.
 */
export async function LegalDocumentPage({
  kind,
  eyebrow,
  fallbackTitle,
}: {
  kind: PublicLegalDocumentKind;
  eyebrow: string;
  fallbackTitle: string;
}) {
  const document = await fetchPublicLegalDocument(kind);

  return (
    <>
      <PageHero id="dokument">
        <div className="max-w-[720px]">
          <Eyebrow className="mb-4">{eyebrow}</Eyebrow>
          <h1 className="text-forest mb-[18px] font-serif text-[clamp(28px,7.5vw,40px)] leading-[1.08] font-normal tracking-[-0.015em] text-pretty md:text-[44px]">
            {document?.title || fallbackTitle}
          </h1>
          {document ? (
            <p className="text-coffee/55 text-[13px]">
              Verzija {document.versionLabel}
              {document.publishedAt
                ? ` · objavljeno ${new Date(document.publishedAt).toLocaleDateString("sr-Latn-RS")}`
                : ""}
            </p>
          ) : null}
        </div>
      </PageHero>
      <section className="pt-[56px] pb-[80px] md:pt-16 md:pb-24">
        <div className="mx-auto max-w-[760px] px-5 md:px-8">
          {document ? (
            <RichText doc={document.body} />
          ) : (
            <div className="border-coffee/12 bg-surface rounded-[20px] border px-6 py-8">
              <p className="text-coffee text-[15px] font-semibold">
                Ovaj dokument je u pripremi.
              </p>
              <p className="text-coffee/70 mt-2.5 text-[14px] leading-[1.6]">
                Tekst čeka pravnu potvrdu pre objave. Za pitanja u međuvremenu
                pišite nam na{" "}
                <a
                  href={`mailto:${siteSettings.contactEmail}`}
                  className="text-forest underline underline-offset-2"
                >
                  {siteSettings.contactEmail}
                </a>
                .
              </p>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
