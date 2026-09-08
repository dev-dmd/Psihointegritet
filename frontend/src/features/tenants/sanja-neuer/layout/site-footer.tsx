import { sanjaContent, sanjaNav } from "@/features/tenants/sanja-neuer/content";
import { BookButton } from "@/features/tenants/sanja-neuer/ui/book-button";

const { wordmark, footer } = sanjaContent;

/** Four columns that collapse to one, and the line that names the platform. */
export function SanjaFooter() {
  return (
    <footer className="bg-sn-ink text-sn-ivory/72">
      <div className="mx-auto grid max-w-[1180px] grid-cols-[repeat(auto-fit,minmax(min(100%,200px),1fr))] gap-9 px-6 pt-16 pb-7">
        <div>
          <p className="font-sn-display text-sn-ivory mb-3.5 text-[19px] tracking-[0.3em] uppercase">
            {wordmark}
          </p>
          <p className="text-sm leading-[1.7]">{footer.tagline}</p>
        </div>

        <div>
          <p className="text-sn-lilac mb-3.5 text-[11px] tracking-[0.2em] uppercase">
            {footer.pagesLabel}
          </p>
          <div className="flex flex-col gap-[9px]">
            {sanjaNav.slice(0, 4).map((item) => (
              <a
                key={item.id}
                href={`#${item.id}`}
                className="text-sn-ivory/72 hover:text-sn-ivory text-sm transition-colors"
              >
                {item.label}
              </a>
            ))}
          </div>
        </div>

        <div>
          <p className="text-sn-lilac mb-3.5 text-[11px] tracking-[0.2em] uppercase">
            {footer.topicsLabel}
          </p>
          <div className="flex flex-col gap-[9px]">
            {footer.topics.map((topic) => (
              <a
                key={topic}
                href="#blog"
                className="text-sn-ivory/72 hover:text-sn-ivory text-sm transition-colors"
              >
                {topic}
              </a>
            ))}
          </div>
        </div>

        <div>
          <p className="text-sn-lilac mb-3.5 text-[11px] tracking-[0.2em] uppercase">
            {footer.bookingLabel}
          </p>
          <BookButton variant="ivory-outline" className="px-5 py-3 text-xs">
            {footer.bookingCta}
          </BookButton>
          <p className="mt-3.5 text-[13px] leading-[1.7]">
            {footer.availability}
          </p>
        </div>
      </div>

      <div className="border-sn-ivory/14 mx-auto flex max-w-[1180px] flex-wrap justify-between gap-3.5 border-t px-6 pt-5 pb-10">
        <p className="text-xs tracking-[0.06em]">{footer.rights}</p>
        <p className="text-xs tracking-[0.06em]">
          {footer.platformPrefix}
          <a
            href="https://p-digital-center.com"
            className="text-sn-lilac hover:text-sn-ivory transition-colors"
          >
            {footer.platformName}
          </a>
          {footer.platformSuffix}
        </p>
      </div>
    </footer>
  );
}
