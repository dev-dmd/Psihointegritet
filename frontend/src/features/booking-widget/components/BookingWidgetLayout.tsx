import { cn } from "@/helpers/cn";

import { BookingWidgetBrandPanel } from "./BookingWidgetBrandPanel";
import type { BookingWidgetLayoutProps } from "../booking-widget.types";

export function BookingWidgetLayout({
  children,
  brand,
  showBrandPanel,
  theme,
  variant,
  className,
}: BookingWidgetLayoutProps) {
  return (
    <article
      data-booking-widget-variant={variant}
      className={cn(
        "booking-widget relative isolate w-full overflow-hidden rounded-[28px] md:rounded-[32px]",
        theme.root,
        className,
      )}
    >
      <div className="booking-widget-ambient booking-widget-ambient--one" />
      <div className="booking-widget-ambient booking-widget-ambient--two" />
      <div
        className={cn(
          "relative grid gap-4 p-4 sm:p-6 lg:gap-6 lg:p-8",
          showBrandPanel && "lg:grid-cols-[minmax(240px,0.28fr)_1fr]",
        )}
      >
        {showBrandPanel ? (
          <BookingWidgetBrandPanel brand={brand} theme={theme} />
        ) : null}
        <section
          className={cn(
            "booking-widget-content-panel relative overflow-hidden rounded-[24px] border p-5 sm:p-6 lg:p-7",
            theme.panel,
            theme.contentPanel,
          )}
        >
          {theme.showContentBlob ? (
            <div
              aria-hidden="true"
              className="absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80"
            >
              <div
                style={{
                  clipPath:
                    "polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)",
                }}
                className={cn(
                  "relative left-[calc(50%-11rem)] aspect-1155/678 w-144.5 -translate-x-1/2 rotate-30 bg-linear-to-tr opacity-30 sm:left-[calc(50%-30rem)] sm:w-288.75",
                  theme.contentBlob,
                )}
              />
            </div>
          ) : null}
          <div
            aria-hidden="true"
            className="booking-widget-content-ambient booking-widget-content-ambient--two"
          />
          <div className="relative z-10">{children}</div>
        </section>
      </div>
    </article>
  );
}
