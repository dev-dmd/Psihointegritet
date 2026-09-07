import { sanjaContent } from "@/features/tenants/sanja-neuer/content";
import { Eyebrow } from "@/features/tenants/sanja-neuer/ui/eyebrow";
import { SectionHeading } from "@/features/tenants/sanja-neuer/ui/section-heading";

const { process } = sanjaContent;

/** Four separate tiles rather than one bordered strip — the gap is the design. */
export function SanjaProcess() {
  return (
    <section className="mx-auto max-w-[1180px] px-6 py-[88px]">
      <Eyebrow tone="burgundy">{process.eyebrow}</Eyebrow>
      <SectionHeading className="mb-11 max-w-[620px]">
        {process.title}
      </SectionHeading>

      <ol className="grid list-none grid-cols-[repeat(auto-fit,minmax(min(100%,230px),1fr))] gap-4 p-0">
        {process.steps.map((step) => (
          <li
            key={step.index}
            className="bg-sn-surface hover:border-sn-burgundy flex flex-col gap-3 rounded-[18px] border border-transparent px-[26px] py-[30px] transition-colors"
          >
            <span className="font-sn-display text-sn-lilac text-[34px] leading-none">
              {step.index}
            </span>
            <h3 className="text-sn-ink text-[15px] tracking-[0.1em] uppercase">
              {step.title}
            </h3>
            <p className="text-sn-ink/70 text-[15px] leading-[1.7]">
              {step.body}
            </p>
          </li>
        ))}
      </ol>
    </section>
  );
}
