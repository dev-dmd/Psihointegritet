import { LegalDocumentPage } from "@/components/sections/legal/legal-document-page";
import { metadataForRoute } from "@/lib/content-governance/discoverability";
import { getContentProvider } from "@/lib/content-governance/provider-resolver";

export async function generateMetadata() {
  return metadataForRoute("/uslovi", await getContentProvider());
}

export default function UsloviPage() {
  return (
    <LegalDocumentPage
      kind="terms_of_use"
      eyebrow="Pravni tekst"
      fallbackTitle="Uslovi korišćenja"
    />
  );
}
