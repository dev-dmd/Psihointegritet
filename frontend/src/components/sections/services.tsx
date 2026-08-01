import Link from "next/link";
import type { Route } from "next";

import { Reveal } from "@/components/motion/reveal";
import { ButtonLink } from "@/components/ui/button-link";
import { Chip } from "@/components/ui/chip";
import { SectionHeading } from "@/components/ui/section-heading";
import {
  homepageOfferCards,
  type HomepageOfferCard,
} from "@/content/homepage-offers";
import { cn } from "@/helpers/cn";

type OfferCardVariant = "default" | "glass" | "light" | "dark";

const offerCardStyles: Record<
  OfferCardVariant,
  {
    card: string;
    badge: string;
    title: string;
    description: string;
    metaChip: string;
    primaryAction: string;
    secondaryAction: string;
    tertiaryAction: string;
  }
> = {
  default: {
    card: "border border-coffee/6 bg-surface rounded-[22px]",
    badge: "text-sage",
    title: "text-forest",
    description: "text-coffee/68",
    metaChip: "bg-meadow/22 text-coffee",
    primaryAction:
      "text-forest hover:text-sage underline underline-offset-4 focus-visible:outline-sage",
    secondaryAction:
      "text-forest hover:text-sage underline underline-offset-4 focus-visible:outline-sage",
    tertiaryAction:
      "text-forest hover:text-sage underline underline-offset-4 focus-visible:outline-sage",
  },
  glass: {
    card: "rounded-[28px] border border-white/70 bg-white/45 text-[#2e3b2e] shadow-[0_20px_60px_rgba(46,59,46,0.12)] backdrop-blur-xl hover:shadow-[0_28px_70px_rgba(46,59,46,0.16)]",
    badge:
      "border border-[#c6d5a8]/45 bg-white/45 text-[#2e3b2e] backdrop-blur-md",
    title: "text-[#2e3b2e]",
    description: "text-[#3a2e28]/75",
    metaChip:
      "border border-white/65 bg-white/42 text-[#2e3b2e]/72 shadow-[inset_0_1px_0_rgba(255,255,255,0.65)] backdrop-blur-md",
    primaryAction:
      "bg-[#2e3b2e] text-white shadow-[0_10px_24px_rgba(46,59,46,0.18)] hover:bg-[#3a4a39] focus-visible:outline-[#d1a48c]",
    secondaryAction:
      "border border-[#2e3b2e]/20 bg-transparent text-[#2e3b2e] hover:bg-white/40 focus-visible:outline-[#d1a48c]",
    tertiaryAction:
      "border border-[#2e3b2e]/14 bg-white/25 text-[#2e3b2e] hover:bg-white/45 focus-visible:outline-[#d1a48c]",
  },
  light: {
    card: "rounded-[28px] border border-[#2e3b2e]/10 bg-[linear-gradient(145deg,#ffffff_0%,#f7f5ef_55%,#eef2e9_100%)] shadow-[0_18px_45px_rgba(46,59,46,0.10)] hover:shadow-[0_24px_58px_rgba(46,59,46,0.14)]",
    badge: "border border-[#d1a48c]/35 bg-[#d1a48c]/20 text-[#3a2e28]",
    title: "text-[#2e3b2e]",
    description: "text-[#3a2e28]/75",
    metaChip: "border border-[#2e3b2e]/10 bg-white/62 text-[#2e3b2e]/65",
    primaryAction:
      "border border-[#2e3b2e]/18 bg-white/50 text-[#2e3b2e] hover:bg-[#c6d5a8]/24 focus-visible:outline-[#d1a48c]",
    secondaryAction:
      "border border-[#2e3b2e]/18 bg-white/50 text-[#2e3b2e] hover:bg-[#c6d5a8]/24 focus-visible:outline-[#d1a48c]",
    tertiaryAction:
      "border border-[#2e3b2e]/12 bg-transparent text-[#2e3b2e] hover:bg-white/55 focus-visible:outline-[#d1a48c]",
  },
  dark: {
    card: "rounded-[28px] border border-white/10 bg-[#2e3b2e] shadow-[0_24px_60px_rgba(46,59,46,0.22)] hover:shadow-[0_30px_72px_rgba(46,59,46,0.28)]",
    badge: "border border-[#c6d5a8]/25 bg-white/8 text-[#c6d5a8]",
    title: "text-white",
    description: "text-white/75",
    metaChip: "border border-white/10 bg-white/8 text-[#c6d5a8]",
    primaryAction:
      "bg-[#c6d5a8] text-[#2e3b2e] hover:bg-white focus-visible:outline-[#d1a48c]",
    secondaryAction:
      "bg-[#c6d5a8] text-[#2e3b2e] hover:bg-white focus-visible:outline-[#d1a48c]",
    tertiaryAction:
      "border border-[#c6d5a8]/24 bg-transparent text-[#c6d5a8] hover:bg-white/8 focus-visible:outline-[#d1a48c]",
  },
};

export function Services() {
  const featured = homepageOfferCards.find((item) => item.featured);
  const standard = homepageOfferCards.filter((item) => !item.featured);
  const standardLead = standard.slice(0, -2);
  const balancedTail = standard.slice(-2);

  return (
    <section id="usluge" className="scroll-mt-24 pt-[72px] md:pt-32">
      <div className="mx-auto max-w-[1536px] px-5 md:px-8">
        <Reveal>
          <SectionHeading
            eyebrow="Usluge"
            title="Podrška prilagođena vašoj situaciji"
            description="Svaka usluga jasno definiše šta uključuje, kome odgovara i koji je sledeći korak."
            className="mb-14"
          />
          <div className="space-y-5">
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
              {featured ? <FeaturedOfferCard offer={featured} /> : null}
              {standardLead.map((offer) => (
                <OfferCard key={offer.id} offer={offer} />
              ))}
            </div>
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              {balancedTail.map((offer) => (
                <OfferCard key={offer.id} offer={offer} />
              ))}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function FeaturedOfferCard({ offer }: { offer: HomepageOfferCard }) {
  return (
    <article className="bg-forest flex flex-col justify-between gap-12 rounded-[28px] p-8 md:col-span-2 md:min-h-[520px] md:p-14 lg:row-span-2">
      <div>
        {offer.badge ? <Chip variant="labelSolid">{offer.badge}</Chip> : null}
        <h3 className="text-canvas mt-[22px] mb-4 font-serif text-[34px] leading-[1.08] font-normal tracking-[-0.01em] md:text-[42px]">
          {offer.title}
        </h3>
        <p className="text-canvas/72 max-w-[520px] text-base leading-[1.65]">
          {offer.description}
        </p>
      </div>
      <div className="flex flex-wrap items-end justify-between gap-8">
        <div className="flex flex-wrap gap-[18px] md:gap-10">
          <OfferFacts offer={offer} />
        </div>
        {offer.bookingHref ? (
          <ButtonLink
            href={offer.bookingHref}
            variant="light"
            className="whitespace-nowrap"
          >
            Zakaži prvi razgovor
          </ButtonLink>
        ) : null}
      </div>
    </article>
  );
}

function OfferCard({ offer }: { offer: HomepageOfferCard }) {
  const variant = getOfferCardVariant(offer);
  const styles = offerCardStyles[variant];
  const muted = offer.status === "coming-soon";
  const badgeLabel =
    variant === "glass" ? "Za roditelje" : muted ? "U pripremi" : undefined;
  const actions = [
    {
      href: offer.detailsHref,
      label: "Saznaj više",
      emphasis: "secondary" as const,
    },
    ...(offer.bookingHref
      ? [
          {
            href: offer.bookingHref,
            label: "Zakaži termin",
            emphasis: "primary" as const,
          },
        ]
      : []),
    ...(offer.relatedHref
      ? [
          {
            href: offer.relatedHref,
            label: "Za roditelje",
            emphasis: "tertiary" as const,
          },
        ]
      : []),
  ];

  return (
    <article
      className={cn(
        "group relative isolate flex min-h-[280px] flex-col overflow-hidden px-6 py-[26px] transition-all duration-300 ease-out motion-safe:focus-within:-translate-y-1 motion-safe:hover:-translate-y-1 motion-reduce:transition-none md:px-[30px] md:pt-[30px]",
        styles.card,
      )}
    >
      <OfferCardDecoration variant={variant} />
      <div className="relative z-10">
        {badgeLabel ? (
          <p
            className={cn(
              "mb-3 inline-flex h-[30px] items-center rounded-full px-3.5 text-xs font-semibold tracking-[0.1em] uppercase",
              styles.badge,
            )}
          >
            {badgeLabel}
          </p>
        ) : null}
        <h3
          className={cn(
            "mb-2.5 font-serif text-[27px] leading-[1.12] font-normal md:text-[28px]",
            styles.title,
          )}
        >
          {offer.title}
        </h3>
        <p className={cn("text-[14.5px] leading-7", styles.description)}>
          {offer.description}
        </p>
      </div>
      <div className="relative z-10 mt-auto">
        <div className="mb-[18px] flex flex-wrap gap-2.5">
          {[offer.durationLabel, offer.priceLabel, offer.formatLabel].map(
            (label) => (
              <span
                key={label}
                className={cn(
                  "inline-flex items-center rounded-full px-[13px] py-1.5 text-[13px] font-medium",
                  styles.metaChip,
                )}
              >
                {label}
              </span>
            ),
          )}
        </div>
        <div className="flex flex-wrap gap-x-5 gap-y-3">
          {actions.map((action) => (
            <Link
              key={`${action.label}-${action.href}`}
              href={action.href as Route}
              className={cn(
                "inline-flex min-h-11 items-center rounded-full text-[14.5px] font-semibold transition-colors duration-300 focus-visible:outline-2 focus-visible:outline-offset-4",
                variant === "default" ? "px-0" : "px-5",
                action.emphasis === "primary"
                  ? styles.primaryAction
                  : action.emphasis === "tertiary"
                    ? styles.tertiaryAction
                    : styles.secondaryAction,
              )}
            >
              {action.label}
            </Link>
          ))}
        </div>
      </div>
    </article>
  );
}

function getOfferCardVariant(offer: HomepageOfferCard): OfferCardVariant {
  if (offer.id === "roditeljsko-savetovanje") {
    return "glass";
  }

  if (offer.id === "adolescenti") {
    return "light";
  }

  if (offer.id === "radionice") {
    return "dark";
  }

  return "default";
}

function OfferCardDecoration({ variant }: { variant: OfferCardVariant }) {
  if (variant === "glass") {
    return (
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute -top-14 -right-16 h-44 w-44 rounded-full bg-[#c6d5a8]/35 blur-3xl" />
        <div className="absolute -bottom-16 -left-12 h-40 w-40 rounded-full bg-[#d1a48c]/25 blur-3xl" />
        <div className="absolute inset-px rounded-[27px] border border-white/40 shadow-[inset_0_1px_0_rgba(255,255,255,0.65)]" />
      </div>
    );
  }

  if (variant === "light") {
    return (
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute -top-16 -right-12 h-48 w-48 rounded-full border border-[#2e3b2e]/10" />
        <div className="absolute -top-8 -right-20 h-36 w-56 rotate-12 rounded-full border border-[#d1a48c]/20" />
        <div className="absolute -bottom-20 left-6 h-40 w-40 rounded-full border border-[#8a9d82]/12" />
      </div>
    );
  }

  if (variant === "dark") {
    return (
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute -top-20 -right-14 h-56 w-56 rounded-full border border-[#c6d5a8]/20" />
        <div className="absolute top-7 -right-24 h-36 w-60 rotate-12 rounded-full border border-[#d1a48c]/20" />
        <div className="absolute -bottom-20 -left-14 h-48 w-48 rounded-full bg-[#d1a48c]/10 blur-2xl" />
      </div>
    );
  }

  return null;
}

function OfferFacts({ offer }: { offer: HomepageOfferCard }) {
  const facts = [
    ["Trajanje", offer.durationLabel],
    ["Cena", offer.priceLabel],
    ["Format", offer.formatLabel],
  ];
  return facts.map(([label, value], index) => (
    <div
      key={label}
      className={
        index > 0 ? "md:border-canvas/15 md:border-l md:pl-10" : undefined
      }
    >
      <div className="text-meadow/85 mb-1.5 text-[11.5px] font-semibold tracking-[0.14em] uppercase">
        {label}
      </div>
      <div className="text-canvas font-serif text-2xl">{value}</div>
    </div>
  ));
}
