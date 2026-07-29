import { LegalDocumentPage } from "@/components/sections/legal/legal-document-page";
import { metadataForRoute } from "@/lib/content-governance/discoverability";

export const metadata = metadataForRoute("/uslovi");

export default function UsloviPage() {
  return (
    <LegalDocumentPage
      kind="terms_of_use"
      eyebrow="Pravni tekst"
      fallbackTitle="Uslovi korišćenja"
    />
  );
}
