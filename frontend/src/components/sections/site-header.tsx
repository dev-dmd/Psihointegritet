import type { Route } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { StickyBar } from "@/components/motion/sticky-bar";
import { MobileMenu } from "@/components/sections/mobile-menu";
import { AnimatedCtaLink } from "@/components/ui/animated-cta-link";
import {
  headerBookingHref,
  visibleHeaderNavLinks,
} from "@/content/site-navigation";
import { isCompassPublicEnabled } from "@/lib/compass/flags";
import { AuthMenu } from "@/lib/auth/clerk/auth-menu";
import { MobileAuthSection } from "@/lib/auth/clerk/mobile-auth-section";

/**
 * Transparent header over the hero plus the scroll-activated sticky pill.
 * All navigation content is server-rendered; only the sticky show/hide
 * behavior lives in the StickyBar client boundary. Rendered on every public
 * page (app/(public)/layout.tsx), so hrefs are absolute and go through
 * next/link — no full page loads.
 */
export async function SiteHeader() {
  const t = await getTranslations("public");
  const navLinks = visibleHeaderNavLinks(isCompassPublicEnabled(), (key) =>
    t(`navigation.links.${key}`),
  );

  return (
    <>
      <header className="absolute inset-x-0 top-0 z-[60] px-4 pt-10 md:pt-[42px]">
        <div className="mx-auto grid max-w-[1536px] grid-cols-[1fr_auto_1fr] items-center gap-6 px-5 md:px-20">
          <Link
            href="/"
            className="col-start-1 flex items-baseline justify-self-start no-underline"
          >
            <span className="text-forest flex max-h-[48px] flex-col items-start gap-[1px] font-serif text-xl leading-none font-bold tracking-[-0.01em] md:text-[32px]">
              <span>Psihointegritet</span>
              <small className="text-forest-lift hidden text-[13px] leading-none font-normal tracking-[0.01em] md:block">
                {t("brand.tagline")}
              </small>
            </span>
            <span
              aria-hidden
              className="bg-warm-shine ml-1 inline-block h-1.5 w-1.5 rounded-full"
            />
          </Link>
          <nav
            aria-label={t("navigation.mainLabel")}
            className="col-start-2 hidden items-center gap-[clamp(12px,1.4vw,26px)] justify-self-center rounded-full bg-gray-300/32 px-[clamp(18px,1.8vw,28px)] py-[13px] whitespace-nowrap backdrop-blur-[14px] lg:flex"
          >
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href as Route}
                className="text-forest text-[clamp(11px,0.55vw+6px,14px)] font-medium no-underline transition-colors duration-200 hover:underline"
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="col-start-3 flex items-center gap-2.5 justify-self-end">
            <AuthMenu />
            <AnimatedCtaLink
              href={headerBookingHref}
              label={t("navigation.book")}
              className="max-[480px]:hidden"
            />
            <MobileMenu
              links={navLinks}
              bookLabel={t("navigation.book")}
              authSlot={<MobileAuthSection />}
            />
          </div>
        </div>
      </header>

      <StickyBar>
        <Link href="/" className="flex items-baseline no-underline">
          <span className="text-forest font-serif text-[19px] font-medium tracking-[0.01em]">
            P
          </span>
          <span
            aria-hidden
            className="bg-warm-shine ml-[3px] inline-block h-[5px] w-[5px] rounded-full"
          />
        </Link>
        <nav
          aria-label={t("navigation.quickLabel")}
          className="hidden items-center gap-[clamp(12px,1.2vw,22px)] lg:flex"
        >
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href as Route}
              className="text-forest text-[13px] font-medium transition-colors duration-200 hover:underline"
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <AuthMenu size="sm" />
        <AnimatedCtaLink
          href={headerBookingHref}
          label={t("navigation.book")}
          size="sm"
        />
        <MobileMenu
          links={navLinks}
          bookLabel={t("navigation.book")}
          variant="solid"
          authSlot={<MobileAuthSection />}
        />
      </StickyBar>
    </>
  );
}
