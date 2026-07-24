import { cn } from "@/helpers/cn";

import { BookingWidgetMobileBrand } from "./BookingWidgetBrandPanel";
import { useBookingWidget } from "../hooks/use-booking-widget";
import type {
  BookingService,
  BookingWidgetBrand,
  BookingWidgetCopy,
  BookingWidgetTheme,
} from "../booking-widget.types";

interface BookingWidgetHeaderProps {
  brand: BookingWidgetBrand;
  service: BookingService;
  copy: BookingWidgetCopy;
  theme: BookingWidgetTheme;
}

export function BookingWidgetHeader({
  brand,
  service,
  copy,
  theme,
}: BookingWidgetHeaderProps) {
  const { selectedFormat, setSelectedFormat } = useBookingWidget();
  const formatOptions = service.formats.map((format) => ({
    value: format,
    label: format === "online" ? copy.onlineLabel : copy.inPersonLabel,
  }));

  return (
    <header className={cn("border-b pb-5", theme.border)}>
      <BookingWidgetMobileBrand brand={brand} theme={theme} />
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="lg:flex lg:items-baseline lg:gap-3">
          <h2
            id="booking-widget-title"
            className={cn(
              "font-serif text-[28px] leading-none font-normal sm:text-[31px]",
              theme.heading,
            )}
          >
            {copy.title}
          </h2>
          <p
            id="booking-widget-notice"
            className={cn(
              "mt-2 text-[13px] leading-[1.5] lg:mt-0 lg:whitespace-nowrap",
              theme.muted,
            )}
          >
            <span aria-hidden className="text-warm mr-2 text-base leading-none">
              •
            </span>
            {copy.requestNotice}
          </p>
        </div>
        <div
          role="radiogroup"
          aria-label="Način rada"
          className={cn(
            "grid min-h-10 grid-cols-2 rounded-full border p-1 lg:w-[214px]",
            theme.switchTrack,
          )}
        >
          {formatOptions.map((option) => {
            const isSelected = option.value === selectedFormat;
            return (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={isSelected}
                onClick={() => setSelectedFormat(option.value)}
                className={cn(
                  "focus-visible:ring-meadow cursor-pointer rounded-full px-3 py-1.5 text-[13px] font-medium transition-all duration-300 ease-out outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
                  isSelected
                    ? theme.switchActive
                    : cn(theme.muted, "hover:text-current"),
                )}
              >
                <span
                  aria-hidden
                  className={cn(
                    "mr-1.5 inline-block h-2.5 w-2.5 rounded-full border align-middle",
                    isSelected
                      ? "border-current bg-current/30"
                      : "border-current/35",
                  )}
                />
                {option.label}
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
}
