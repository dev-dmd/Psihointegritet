import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/outline";

import { cn } from "@/helpers/cn";

import {
  bookingMonthLabels,
  bookingWeekdayLabels,
  isPastDate,
  monthGrid,
  toDateKey,
} from "../booking-widget.config";
import { useBookingWidget } from "../hooks/use-booking-widget";
import type { BookingWidgetTheme } from "../booking-widget.types";

interface BookingWidgetCalendarProps {
  theme: BookingWidgetTheme;
}

function moveMonth(month: Date, offset: number): Date {
  return new Date(month.getFullYear(), month.getMonth() + offset, 1);
}

export function BookingWidgetCalendar({ theme }: BookingWidgetCalendarProps) {
  const {
    availableDates,
    calendarOpen,
    month,
    selectedDate,
    setCalendarOpen,
    setMonth,
    setSelectedDate,
  } = useBookingWidget();
  const today = toDateKey(new Date());
  const days = monthGrid(month);

  return (
    <section aria-label="Izbor datuma" className="relative min-w-0">
      <div className="mb-3 flex items-center justify-between gap-2">
        <button
          type="button"
          aria-label="Prethodni mesec"
          onClick={() => setMonth(moveMonth(month, -1))}
          className={cn(
            "focus-visible:ring-meadow inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-full transition-colors outline-none focus-visible:ring-2",
            theme.muted,
          )}
        >
          <ChevronLeftIcon className="size-4" />
        </button>
        <button
          type="button"
          aria-expanded={calendarOpen}
          aria-haspopup="dialog"
          onClick={() => setCalendarOpen(!calendarOpen)}
          className={cn(
            "focus-visible:ring-meadow cursor-pointer rounded-full px-3 py-2 text-sm font-semibold transition-colors outline-none focus-visible:ring-2",
            theme.body,
          )}
        >
          {bookingMonthLabels[month.getMonth()]} {month.getFullYear()}
        </button>
        <button
          type="button"
          aria-label="Sledeći mesec"
          onClick={() => setMonth(moveMonth(month, 1))}
          className={cn(
            "focus-visible:ring-meadow inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-full transition-colors outline-none focus-visible:ring-2",
            theme.muted,
          )}
        >
          <ChevronRightIcon className="size-4" />
        </button>
      </div>

      {calendarOpen ? (
        <div
          role="dialog"
          aria-label="Izaberite mesec"
          className={cn(
            "shadow-pill absolute top-11 z-20 grid w-full grid-cols-3 gap-1 rounded-2xl border p-3",
            theme.panel,
            theme.border,
          )}
        >
          {bookingMonthLabels.map((label, index) => (
            <button
              key={label}
              type="button"
              onClick={() => {
                setMonth(new Date(month.getFullYear(), index, 1));
                setCalendarOpen(false);
              }}
              className={cn(
                "focus-visible:ring-meadow cursor-pointer rounded-lg px-2 py-2 text-xs transition-colors outline-none focus-visible:ring-2",
                index === month.getMonth()
                  ? theme.calendarSelectedDay
                  : cn(theme.muted, "hover:bg-meadow/20"),
              )}
            >
              {label.slice(0, 3)}
            </button>
          ))}
        </div>
      ) : null}

      <div className="grid grid-cols-7 gap-y-1 text-center">
        {bookingWeekdayLabels.map((weekday) => (
          <span
            key={weekday}
            className={cn("pb-1 text-[10px] font-medium", theme.muted)}
          >
            {weekday}
          </span>
        ))}
        {days.map((day, index) => {
          if (!day) return <span key={`empty-${index}`} aria-hidden />;

          const dateKey = toDateKey(day);
          const isAvailable = availableDates.has(dateKey);
          const isSelected = selectedDate === dateKey;
          const isDisabled = !isAvailable || isPastDate(dateKey);

          return (
            <button
              key={dateKey}
              type="button"
              disabled={isDisabled}
              aria-pressed={isSelected}
              aria-current={dateKey === today ? "date" : undefined}
              onClick={() => {
                setSelectedDate(dateKey);
                setCalendarOpen(false);
              }}
              className={cn(
                "focus-visible:ring-meadow mx-auto flex h-8 w-8 items-center justify-center rounded-full text-xs transition-all duration-300 ease-out outline-none focus-visible:ring-2 disabled:cursor-not-allowed",
                isSelected
                  ? theme.calendarSelectedDay
                  : isDisabled
                    ? theme.calendarDisabledDay
                    : theme.calendarAvailableDay,
                dateKey === today && !isSelected && "ring-warm/70 ring-1",
              )}
            >
              {day.getDate()}
            </button>
          );
        })}
      </div>
    </section>
  );
}
