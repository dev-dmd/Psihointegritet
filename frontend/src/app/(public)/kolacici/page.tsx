import { LegalDocumentPage } from "@/components/sections/legal/legal-document-page";
import { metadataForRoute } from "@/lib/content-governance/discoverability";
import { getContentProvider } from "@/lib/content-governance/provider-resolver";

export async function generateMetadata() {
  return metadataForRoute("/kolacici", await getContentProvider());
}

export default function KolaciciPage() {
  return (
    <LegalDocumentPage
      kind="cookie_policy"
      eyebrow="Pravni tekst"
      fallbackTitle="Politika kolačića"
    />
  );
}
