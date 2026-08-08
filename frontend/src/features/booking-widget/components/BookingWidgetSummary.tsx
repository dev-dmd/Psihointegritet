"use client";

import Image from "next/image";

import { cn } from "@/helpers/cn";

import { formatBookingPrice } from "../booking-widget.config";
import { useBookingWidget } from "../hooks/use-booking-widget";
import type {
  BookingService,
  BookingTherapist,
  BookingWidgetTheme,
} from "../booking-widget.types";

// ── Props ───────────────────────────────────────────────────────────────────

interface BookingWidgetSummaryProps {
  services: BookingService[];
  therapists: BookingTherapist[];
  showTherapist: boolean;
  theme: BookingWidgetTheme;
}

// ── Component ───────────────────────────────────────────────────────────────

export function BookingWidgetSummary({
  services,
  therapists,
  showTherapist,
  theme,
}: BookingWidgetSummaryProps) {
  const {
    selectedServiceId,
    selectedTherapistId,
    setSelectedServiceId,
    setSelectedTherapistId,
  } = useBookingWidget();

  const selectedService = services.find((s) => s.id === selectedServiceId) ?? services[0];
  const selectedTherapist = therapists.find((t) => t.id === selectedTherapistId) ?? null;

  // Filter services to those the selected therapist provides
  const therapistServiceIds = selectedTherapist?.serviceSlugs;
  const filteredServices = therapistServiceIds
    ? services.filter((s) => therapistServiceIds.includes(s.slug))
    : services;
  const availableServices = selectedService
    ? filteredServices.filter((s) => s.id !== selectedService.id)
    : filteredServices;
  const otherTherapists = selectedTherapist
    ? therapists.filter((t) => t.id !== selectedTherapist.id)
    : therapists;

  return (
    <section aria-labelledby="booking-service-name" className="min-w-0">
      {/* Selected treatment — large display, reveals on change */}
      <div key={`svc-${selectedServiceId}`} className="animate-reveal-fade">
        <h3
          id="booking-service-name"
          className={cn(
            "font-serif text-3xl leading-[1.05] font-normal uppercase tracking-wide sm:text-4xl",
            theme.heading,
          )}
        >
          {selectedService?.name ?? "Izaberite tretman"}
        </h3>
        <p className={cn("mt-3 text-base sm:text-lg", theme.serviceMeta)}>
          {selectedService?.durationMinutes} minuta
          <span aria-hidden className="text-warm mx-2">
            ·
          </span>
          {selectedService
            ? formatBookingPrice(selectedService.price, selectedService.currency)
            : "—"}
        </p>
      </div>



      {/* Therapist section */}
      {showTherapist ? (
        <div className="mt-6">
          {/* Selected therapist — reveals on change */}
          <div key={`thr-${selectedTherapistId}`} className="animate-reveal-fade">
            <div className="flex items-center gap-3">
              {selectedTherapist?.avatarUrl ? (
                <Image
                  src={selectedTherapist.avatarUrl}
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
                  {selectedTherapist?.name.slice(0, 1) ?? "T"}
                </div>
              )}
              <p className={cn("text-sm font-medium sm:text-[15px]", theme.body)}>
                {selectedTherapist?.name ?? "Tim će predložiti terapeuta"}
              </p>
            </div>
          </div>
                {/* Treatment chips — fixed height, hidden scrollbar */}
      {availableServices.length > 0 ? (
        <div
          className="mt-4 flex h-[76px] flex-wrap items-start gap-2 overflow-y-auto scrollbar-hide"
        >
          <label className={cn("text-[13px] font-semibold tracking-[0.08em] uppercase", theme.muted)}>
            Ostali tretmani
          </label>
          {availableServices.map((svc) => (
            <button
              key={svc.id}
              type="button"
              onClick={() => setSelectedServiceId(svc.id)}
              className={cn(
                "rounded-full border px-3 py-1 text-[12px] font-medium h-[30px] transition-all",
                theme.border,
                theme.muted,
                "hover:border-sage hover:text-current cursor-pointer",
              )}
            >
              {svc.name}
              <span className="ml-1.5 opacity-60">
                {svc.durationMinutes}′ · {formatBookingPrice(svc.price, svc.currency)}
              </span>
            </button>
          ))}
        </div>
      ) : null}

          {/* Other therapist chips — fixed height, hidden scrollbar */}
          {otherTherapists.length > 0 ? (
            <div>
              <label className={cn("text-[13px] w-full font-semibold tracking-[0.08em] uppercase", theme.muted)}>
                Ostali terapeuti
              </label>
            <div
              className="mt-3 flex h-[76px] flex-wrap items-start gap-2 overflow-y-auto scrollbar-hide"
            >

              {otherTherapists.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setSelectedTherapistId(t.id)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[12px] font-medium h-[30px] transition-all",
                    theme.border,
                    theme.muted,
                    "hover:border-sage hover:text-current cursor-pointer",
                  )}
                >
                  {t.avatarUrl ? (
                    <Image
                      src={t.avatarUrl}
                      alt=""
                      width={18}
                      height={18}
                      className="h-[18px] w-[18px] rounded-full object-cover"
                    />
                  ) : (
                    <span className="flex h-[18px] w-[18px] items-center justify-center rounded-full border border-current/30 text-[10px]">
                      {t.name.slice(0, 1)}
                    </span>
                  )}
                  {t.name}
                </button>
              ))}
            </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
