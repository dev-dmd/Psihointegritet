import type { JsonLdNode } from "@/lib/content-governance/discoverability";

interface JsonLdProps {
  data: readonly JsonLdNode[];
}

/** Only structured data generated from the public content contract reaches the page. */
export function JsonLd({ data }: JsonLdProps) {
  if (data.length === 0) return null;

  const json = JSON.stringify(data).replace(/</g, "\\u003c");

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: json }}
    />
  );
}
