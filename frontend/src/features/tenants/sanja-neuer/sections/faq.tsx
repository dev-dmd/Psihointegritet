"use client";

import { useState } from "react";

import { cn } from "@/helpers/cn";
import { sanjaContent } from "@/features/tenants/sanja-neuer/content";
import { sanjaFaq } from "@/features/tenants/sanja-neuer/videos";
import { BookButton } from "@/features/tenants/sanja-neuer/ui/book-button";
import { Eyebrow } from "@/features/tenants/sanja-neuer/ui/eyebrow";
import { SectionHeading } from "@/features/tenants/sanja-neuer/ui/section-heading";

const { faq } = sanjaContent;

/**
 * Single-open accordion: opening one closes the rest.
 *
 * The answer stays in the DOM and is hidden with `grid-rows` rather than
 * unmounted, so the height can transition and so the text is still found by
 * in-page search — an FAQ that cannot be searched is a worse FAQ.
 */
export function SanjaFaq() {
  const [openId, setOpenId] = useState<string | null>(sanjaFaq[0]?.id ?? null);

  return (
    <section
      data-faq
      className="mx-auto grid max-w-[1180px] grid-cols-[repeat(auto-fit,minmax(min(100%,300px),1fr))] items-start gap-14 px-6 py-[88px] max-[620px]:px-3.5"
    >
      <div>
        <Eyebrow tone="burgundy">{faq.eyebrow}</Eyebrow>
        <SectionHeading className="mb-[18px]">{faq.title}</SectionHeading>
        <p className="text-sn-ink/70 mb-6 text-base leading-[1.8]">
          {faq.lead}
        </p>
        <BookButton variant="ink" className="px-7 py-[15px]">
          {faq.cta}
        </BookButton>
      </div>

      <div>
        {sanjaFaq.map((item) => {
          const isOpen = openId === item.id;
          return (
            <div key={item.id} className="border-sn-ink/12 border-b">
              <h3>
                <button
                  type="button"
                  aria-expanded={isOpen}
                  aria-controls={`sn-faq-${item.id}`}
                  onClick={() => setOpenId(isOpen ? null : item.id)}
                  className="focus-visible:ring-sn-burgundy/40 flex w-full cursor-pointer items-start justify-between gap-4 py-5 text-left outline-none focus-visible:ring-2"
                >
                  <span className="font-sn-display text-sn-burgundy text-[19px] leading-[1.35] font-normal sm:text-[22px]">
                    {item.question}
                  </span>
                  <span
                    aria-hidden
                    className={cn(
                      "text-sn-burgundy mt-1 shrink-0 text-xl leading-none transition-transform duration-200",
                      isOpen && "rotate-45",
                    )}
                  >
                    +
                  </span>
                </button>
              </h3>
              <div
                id={`sn-faq-${item.id}`}
                className={cn(
                  "grid transition-[grid-template-rows] duration-200",
                  isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
                )}
              >
                <div className="overflow-hidden">
                  <p className="text-sn-ink/72 pb-5 text-base leading-[1.7]">
                    {item.answer}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
