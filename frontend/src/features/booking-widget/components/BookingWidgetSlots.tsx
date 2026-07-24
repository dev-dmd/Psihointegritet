import { cn } from "@/helpers/cn";

import { useBookingWidget } from "../hooks/use-booking-widget";
import type {
  BookingWidgetCopy,
  BookingWidgetTheme,
} from "../booking-widget.types";

interface BookingWidgetSlotsProps {
  copy: BookingWidgetCopy;
  theme: BookingWidgetTheme;
}

export function BookingWidgetSlots({ copy, theme }: BookingWidgetSlotsProps) {
  const { selectedSlotId, setSelectedSlotId, visibleSlots } =
    useBookingWidget();

  return (
    <section aria-labelledby="booking-slots-title" className="min-w-0">
      <h3
        id="booking-slots-title"
        className={cn("mb-3 text-sm font-semibold", theme.body)}
      >
        {copy.nextAvailableLabel}
      </h3>
      {visibleSlots.length > 0 ? (
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          {visibleSlots.map((slot) => {
            const isSelected = selectedSlotId === slot.id;
            return (
              <button
                key={slot.id}
                type="button"
                aria-pressed={isSelected}
                onClick={() => setSelectedSlotId(slot.id)}
                className={cn(
                  "focus-visible:ring-meadow min-h-9 cursor-pointer rounded-lg border px-2 py-2 text-xs font-medium transition-all duration-300 ease-out outline-none hover:-translate-y-0.5 focus-visible:ring-2",
                  isSelected ? theme.selectedSlot : theme.slot,
                )}
              >
                {slot.startTime}
              </button>
            );
          })}
        </div>
      ) : (
        <p
          className={cn(
            "rounded-2xl border px-4 py-4 text-sm leading-[1.5]",
            theme.border,
            theme.muted,
          )}
        >
          Za izabrani dan trenutno nema slobodnih termina. Izaberite drugi datum
          ili zatražite obaveštenje.
        </p>
      )}
    </section>
  );
}
