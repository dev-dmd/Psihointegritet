import type { Route } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

import type {
  HeadingBlock,
  ListBlock,
  ParagraphBlock,
  QuoteBlock,
  RichBlock,
  RichDoc,
  Span,
} from "@/lib/content-governance/rich-doc";

/**
 * RichDoc v1 renderer (ADR-017 §1). An exhaustive dispatch over the
 * allowlisted node union — **never `dangerouslySetInnerHTML`**. A block type
 * this deployed renderer does not know about yet is skipped, not thrown
 * (ADR-017 §5 forward-compat): a future format extension stays additive
 * instead of forcing a coordinated deploy.
 */
export function RichText({
  doc,
  className,
}: {
  doc: RichDoc;
  className?: string;
}) {
  if (doc.blocks.length === 0) return null;
  return (
    <div className={className}>
      {doc.blocks.map((block) => (
        <RichBlockNode key={block.id} block={block} />
      ))}
    </div>
  );
}

function isHeading(block: RichBlock): block is HeadingBlock {
  return block.type === "heading";
}
function isParagraph(block: RichBlock): block is ParagraphBlock {
  return block.type === "paragraph";
}
function isList(block: RichBlock): block is ListBlock {
  return block.type === "list";
}
function isQuote(block: RichBlock): block is QuoteBlock {
  return block.type === "quote";
}

function RichBlockNode({ block }: { block: RichBlock }) {
  if (isHeading(block)) {
    const spans = <RichSpans spans={block.spans} />;
    if (block.level === 2)
      return (
        <h2 className="text-forest mt-10 mb-4 text-[26px] leading-[1.3] font-semibold first:mt-0">
          {spans}
        </h2>
      );
    if (block.level === 3)
      return (
        <h3 className="text-forest mt-8 mb-3 text-[21px] leading-[1.35] font-semibold first:mt-0">
          {spans}
        </h3>
      );
    return (
      <h4 className="text-forest mt-6 mb-2 text-[18px] leading-[1.4] font-semibold first:mt-0">
        {spans}
      </h4>
    );
  }

  if (isParagraph(block)) {
    return (
      <p className="text-coffee/78 mb-5 text-[17px] leading-[1.78] last:mb-0">
        <RichSpans spans={block.spans} />
      </p>
    );
  }

  if (isList(block)) {
    const Tag = block.ordered ? "ol" : "ul";
    return (
      <Tag
        className={`text-coffee/78 mb-5 space-y-2 pl-6 text-[17px] leading-[1.7] ${
          block.ordered ? "list-decimal" : "list-disc"
        }`}
      >
        {block.items.map((item) => (
          <li key={item.id}>
            <RichSpans spans={item.spans} />
          </li>
        ))}
      </Tag>
    );
  }

  if (isQuote(block)) {
    return (
      <blockquote className="border-sage text-coffee/85 mb-5 border-l-[3px] pl-5 text-[17px] italic leading-[1.7]">
        <RichSpans spans={block.spans} />
      </blockquote>
    );
  }

  // Forward-compat fallback (ADR-017 §5) — an unrecognized block type is
  // skipped rather than thrown. Reachable only for data written by a future
  // format version that this deployed renderer predates.
  return null;
}

function RichSpans({ spans }: { spans: Span[] }) {
  return (
    <>
      {spans.map((span, index) => (
        <RichSpanNode key={index} span={span} />
      ))}
    </>
  );
}

function RichSpanNode({ span }: { span: Span }) {
  let node: ReactNode = span.text;

  for (const mark of span.marks ?? []) {
    if (typeof mark === "object" && mark.type === "link") {
      node = <RichLink href={mark.href}>{node}</RichLink>;
      continue;
    }
    if (mark === "bold") {
      node = <strong className="font-semibold">{node}</strong>;
    } else if (mark === "italic") {
      node = <em>{node}</em>;
    } else if (mark === "underline") {
      // Styled distinctly from links (ADR-017 §4) so underlined text never
      // reads as a broken link.
      node = <span className="underline decoration-1 underline-offset-2">{node}</span>;
    }
  }

  return <>{node}</>;
}

function RichLink({ href, children }: { href: string; children: ReactNode }) {
  const className = "text-forest underline decoration-sage/60 underline-offset-2 hover:decoration-sage";

  if (href.startsWith("/")) {
    return (
      <Link href={href as Route} className={className}>
        {children}
      </Link>
    );
  }

  const isExternal = href.startsWith("https://");
  return (
    <a
      href={href}
      className={className}
      {...(isExternal ? { target: "_blank", rel: "noopener noreferrer" } : {})}
    >
      {children}
    </a>
  );
}
