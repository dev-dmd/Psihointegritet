import { LegalDocumentPage } from "@/components/sections/legal/legal-document-page";
import { metadataForRoute } from "@/lib/content-governance/discoverability";
import { getContentProvider } from "@/lib/content-governance/provider-resolver";
import { getTranslations } from "next-intl/server";

export async function generateMetadata() {
  return metadataForRoute("/kolacici", await getContentProvider());
}

export default async function KolaciciPage() {
  const t = await getTranslations("public.pages.legal");
  return (
    <LegalDocumentPage
      kind="cookie_policy"
      eyebrow={t("eyebrow")}
      fallbackTitle={t("cookieTitle")}
    />
  );
}
