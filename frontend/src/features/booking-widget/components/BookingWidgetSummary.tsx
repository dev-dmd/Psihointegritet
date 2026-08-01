import Image from "next/image";

import { cn } from "@/helpers/cn";

import { formatBookingPrice } from "../booking-widget.config";
import type {
  BookingService,
  BookingTherapist,
  BookingWidgetTheme,
} from "../booking-widget.types";

interface BookingWidgetSummaryProps {
  service: BookingService;
  therapist?: BookingTherapist;
  showTherapist: boolean;
  theme: BookingWidgetTheme;
}

export function BookingWidgetSummary({
  service,
  therapist,
  showTherapist,
  theme,
}: BookingWidgetSummaryProps) {
  return (
    <section aria-labelledby="booking-service-name" className="min-w-0">
      <h3
        id="booking-service-name"
        className={cn(
          "font-serif text-3xl leading-[1.05] font-normal sm:text-4xl",
          theme.heading,
        )}
      >
        {service.name}
      </h3>
      <p className={cn("mt-3 text-base sm:text-lg", theme.serviceMeta)}>
        {service.durationMinutes} minuta
        <span aria-hidden className="text-warm mx-2">
          ·
        </span>
        {formatBookingPrice(service.price, service.currency)}
      </p>

      {showTherapist ? (
        <div className="mt-6 flex items-center gap-3">
          {therapist?.avatarUrl ? (
            <Image
              src={therapist.avatarUrl}
              alt=""
              width={48}
              height={48}
              className="h-11 w-11 rounded-full border border-current/20 object-cover sm:h-12 sm:w-12"
            />
          ) : (
            <div
              aria-hidden
              className={cn(
                "flex h-11 w-11 items-center justify-center rounded-full border border-current/20 font-serif text-lg sm:h-12 sm:w-12",
                theme.heading,
              )}
            >
              {therapist?.name.slice(0, 1) ?? "T"}
            </div>
          )}
          <p className={cn("text-sm font-medium sm:text-[15px]", theme.body)}>
            {therapist?.name ?? "Tim će predložiti terapeuta"}
          </p>
        </div>
      ) : null}
    </section>
  );
}
