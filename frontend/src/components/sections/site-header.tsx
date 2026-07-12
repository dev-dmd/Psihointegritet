import { StickyBar } from "@/components/motion/sticky-bar";
import { MobileMenu } from "@/components/sections/mobile-menu";
import { AnimatedCtaLink } from "@/components/ui/animated-cta-link";
import { navLinks } from "@/content/homepage";

/**
 * Transparent header over the hero plus the scroll-activated sticky pill.
 * All navigation content is server-rendered; only the sticky show/hide
 * behavior lives in the StickyBar client boundary.
 */
export function SiteHeader() {
  return (
    <>
      <header className="absolute inset-x-0 top-0 z-[60] px-4 pt-10 md:pt-[42px]">
        <div className="mx-auto grid max-w-[1536px] grid-cols-[1fr_auto_1fr] items-center gap-6 px-5 md:px-20">
          <a
            href="#vrh"
            className="col-start-1 flex items-baseline justify-self-start no-underline"
          >
            <span className="text-forest font-serif text-xl font-medium tracking-[-0.01em] md:text-[25px]">
              Psihointegritet
            </span>
            <span
              aria-hidden
              className="bg-warm ml-1 inline-block h-1.5 w-1.5 rounded-full"
            />
          </a>
          <nav
            aria-label="Glavna navigacija"
            className="col-start-2 hidden items-center gap-[clamp(12px,1.4vw,26px)] justify-self-center rounded-full border border-white/35 bg-gray-400/32 px-[clamp(18px,1.8vw,28px)] py-[13px] whitespace-nowrap backdrop-blur-[14px] lg:flex"
          >
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-forest-soft hover:text-forest text-[clamp(11px,0.55vw+6px,14px)] font-medium no-underline transition-colors duration-200"
              >
                {link.label}
              </a>
            ))}
          </nav>
          <div className="col-start-3 flex items-center gap-2.5 justify-self-end">
            <AnimatedCtaLink
              href="#usluge"
              label="Zakaži termin"
              className="max-[480px]:hidden"
            />
            <MobileMenu links={navLinks} />
          </div>
        </div>
      </header>

      <StickyBar>
        <a href="#vrh" className="flex items-baseline no-underline">
          <span className="text-forest font-serif text-[19px] font-medium tracking-[0.01em]">
            PZMZ
          </span>
          <span
            aria-hidden
            className="bg-warm ml-[3px] inline-block h-[5px] w-[5px] rounded-full"
          />
        </a>
        <nav
          aria-label="Brza navigacija"
          className="hidden items-center gap-[clamp(12px,1.2vw,22px)] lg:flex"
        >
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-forest-soft hover:text-forest text-[13px] font-medium no-underline transition-colors duration-200"
            >
              {link.label}
            </a>
          ))}
        </nav>
        <AnimatedCtaLink href="#usluge" label="Zakaži termin" size="sm" />
        <MobileMenu links={navLinks} variant="solid" />
      </StickyBar>
    </>
  );
}
