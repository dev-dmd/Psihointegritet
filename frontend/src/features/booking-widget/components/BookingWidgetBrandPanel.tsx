import Image from "next/image";

import { cn } from "@/helpers/cn";

import type {
  BookingWidgetBrand,
  BookingWidgetTheme,
} from "../booking-widget.types";

interface BookingWidgetBrandPanelProps {
  brand: BookingWidgetBrand;
  theme: BookingWidgetTheme;
}

function BrandMark({
  brand,
  size,
}: {
  brand: BookingWidgetBrand;
  size: "large" | "small";
}) {
  const sizeClass = size === "large" ? "h-40 w-40" : "h-10 w-10";

  return (
    <div
      className={cn(
        "relative shrink-0 overflow-hidden rounded-full border border-current/25",
        sizeClass,
      )}
    >
      {brand.logoUrl ? (
        <Image
          src={brand.logoUrl}
          alt={`${brand.name} logo`}
          fill
          sizes={size === "large" ? "160px" : "40px"}
          className="object-cover"
        />
      ) : (
        <span className="flex h-full items-center justify-center font-serif text-xl">
          {brand.name.slice(0, 1)}
        </span>
      )}
    </div>
  );
}

export function BookingWidgetMobileBrand({
  brand,
  theme,
}: BookingWidgetBrandPanelProps) {
  return (
    <div className="mb-5 flex items-center gap-3 lg:hidden">
      <BrandMark brand={brand} size="small" />
      <div>
        <p className={cn("font-serif text-lg leading-none", theme.heading)}>
          {brand.name}
        </p>
        <p
          className={cn("mt-1 text-[11px] leading-tight", theme.brandSubtitle)}
        >
          {brand.subtitle}
        </p>
      </div>
    </div>
  );
}

export function BookingWidgetBrandPanel({
  brand,
  theme,
}: BookingWidgetBrandPanelProps) {
  return (
    <aside
      aria-label={brand.name}
      className={cn(
        "booking-widget-brand-panel relative hidden min-h-full items-center justify-center overflow-hidden rounded-[28px] border p-8 lg:flex",
        theme.brandPanel,
      )}
    >
      <div className="booking-widget-brand-orbit booking-widget-brand-orbit--one" />
      <div className="booking-widget-brand-orbit booking-widget-brand-orbit--two" />
      <div className="booking-widget-brand-orbit booking-widget-brand-orbit--three" />
      <div className="relative z-10 flex max-w-[220px] flex-col items-center text-center">
        <BrandMark brand={brand} size="large" />
        <p
          className={cn(
            "mt-5 font-serif text-[30px] leading-none",
            theme.heading,
          )}
        >
          {brand.name}
        </p>
        <p
          className={cn(
            "mt-3 max-w-[160px] text-sm leading-[1.35]",
            theme.brandSubtitle,
          )}
        >
          {brand.subtitle}
        </p>
      </div>
    </aside>
  );
}
