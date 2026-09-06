import { LegalDocumentPage } from "@/components/sections/legal/legal-document-page";
import { metadataForRoute } from "@/lib/content-governance/discoverability";
import { getContentProvider } from "@/lib/content-governance/provider-resolver";
import { getTranslations } from "next-intl/server";

export async function generateMetadata() {
  return metadataForRoute("/uslovi", await getContentProvider());
}

export default async function UsloviPage() {
  const t = await getTranslations("public.pages.legal");
  return (
    <LegalDocumentPage
      kind="terms_of_use"
      eyebrow={t("eyebrow")}
      fallbackTitle={t("termsTitle")}
    />
  );
}
