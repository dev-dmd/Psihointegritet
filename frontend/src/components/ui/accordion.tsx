"use client";

import { useState } from "react";

export interface AccordionItem {
  id: string;
  question: string;
  answer: string;
}

interface AccordionProps {
  items: AccordionItem[];
  /** Index of the initially expanded item; null collapses all. */
  defaultOpenId?: string | null;
}

/** Single-open FAQ accordion with serif questions and a rotating plus icon. */
export function Accordion({ items, defaultOpenId = null }: AccordionProps) {
  const [openId, setOpenId] = useState<string | null>(defaultOpenId);

  return (
    <div>
      {items.map((item) => {
        const isOpen = item.id === openId;
        const panelId = `accordion-panel-${item.id}`;
        const buttonId = `accordion-button-${item.id}`;

        return (
          <div key={item.id} className="border-coffee/12 border-t">
            <button
              type="button"
              id={buttonId}
              aria-expanded={isOpen}
              aria-controls={panelId}
              onClick={() => setOpenId(isOpen ? null : item.id)}
              className="flex w-full cursor-pointer items-center justify-between gap-8 px-1 py-7 text-left"
            >
              <span className="text-forest font-serif text-[19px] leading-[1.25] font-normal md:text-2xl">
                {item.question}
              </span>
              <span
                aria-hidden
                className={`border-coffee/18 text-forest flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-full border font-sans text-[19px] transition-all duration-300 ${
                  isOpen ? "bg-meadow/40 rotate-45" : "rotate-0 bg-transparent"
                }`}
              >
                +
              </span>
            </button>
            {isOpen ? (
              <div
                id={panelId}
                role="region"
                aria-labelledby={buttonId}
                className="animate-fade-in max-w-[560px] px-1 pb-[30px]"
              >
                <p className="text-coffee/72 text-base leading-[1.7]">
                  {item.answer}
                </p>
              </div>
            ) : null}
          </div>
        );
      })}
      <div className="border-coffee/12 border-t" />
    </div>
  );
}
