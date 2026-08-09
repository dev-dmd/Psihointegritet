"use client";

import {
  createContext,
  useCallback,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  availableDateKeys,
  firstAvailableDate,
  toLocalDate,
} from "../booking-widget.config";
import type {
  BookingFormat,
  BookingService,
  BookingSlot,
  BookingWidgetSubmitPayload,
} from "../booking-widget.types";

export interface BookingWidgetState {
  selectedServiceId: string;
  selectedTherapistId: string | null;
  selectedFormat: BookingFormat;
  selectedDate: string | null;
  selectedSlotId: string | null;
  calendarOpen: boolean;
  notifyOpen: boolean;
  month: Date;
  availableDates: Set<string>;
  visibleSlots: BookingSlot[];
  setSelectedServiceId: (id: string) => void;
  setSelectedTherapistId: (id: string) => void;
  setSelectedFormat: (format: BookingFormat) => void;
  setSelectedDate: (date: string) => void;
  setSelectedSlotId: (slotId: string) => void;
  setCalendarOpen: (isOpen: boolean) => void;
  setNotifyOpen: (isOpen: boolean) => void;
  setMonth: (month: Date) => void;
  resetSelection: () => void;
  buildSubmitPayload: (therapistId?: string) => BookingWidgetSubmitPayload;
}

export const BookingWidgetContext = createContext<BookingWidgetState | null>(
  null,
);

interface BookingWidgetProviderProps {
  services: BookingService[];
  initialServiceId?: string;
  initialTherapistId?: string;
  initialFormat?: BookingFormat;
  slots: BookingSlot[];
  children: ReactNode;
}

function initialMonth(slots: BookingSlot[]): Date {
  const firstDate = firstAvailableDate(slots);
  const date = firstDate ? toLocalDate(firstDate) : new Date();
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function BookingWidgetProvider({
  services,
  initialServiceId,
  initialTherapistId,
  initialFormat,
  slots,
  children,
}: BookingWidgetProviderProps) {
  const defaultServiceId = initialServiceId ?? services[0]?.id ?? "";
  const [selectedServiceId, setSelectedServiceId] = useState(defaultServiceId);
  const [selectedTherapistId, setSelectedTherapistId] = useState<string | null>(
    initialTherapistId ?? null,
  );
  const selectedService = useMemo(
    () =>
      services.find((s) => s.id === selectedServiceId) ?? services[0] ?? null,
    [selectedServiceId, services],
  );
  const availableFormats = selectedService?.formats ?? ["online"];
  const defaultFormat =
    initialFormat && availableFormats.includes(initialFormat)
      ? initialFormat
      : (availableFormats[0] ?? "online");
  const initialDate = firstAvailableDate(slots);
  const [selectedFormat, setSelectedFormat] =
    useState<BookingFormat>(defaultFormat);
  const [selectedDate, setSelectedDate] = useState<string | null>(initialDate);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [notifyOpen, setNotifyOpen] = useState(false);
  const [month, setMonth] = useState(() => initialMonth(slots));
  const dates = useMemo(() => availableDateKeys(slots), [slots]);
  const visibleSlots = useMemo(
    () => slots.filter((slot) => slot.available && slot.date === selectedDate),
    [selectedDate, slots],
  );

  const selectDate = useCallback((date: string) => {
    setSelectedDate(date);
    setSelectedSlotId(null);
  }, []);

  const resetSelection = useCallback(() => {
    setSelectedSlotId(null);
    setSelectedDate(firstAvailableDate(slots));
  }, [slots]);

  const buildSubmitPayload = useCallback(
    (therapistId?: string): BookingWidgetSubmitPayload => {
      const selectedSlot = selectedSlotId
        ? visibleSlots.find((s) => s.id === selectedSlotId)
        : undefined;
      return {
        serviceId: selectedServiceId,
        format: selectedFormat,
        ...((therapistId ?? selectedTherapistId)
          ? { therapistId: (therapistId ?? selectedTherapistId)! }
          : {}),
        ...(selectedSlotId ? { slotId: selectedSlotId } : {}),
        ...(selectedDate ? { selectedDate } : {}),
        ...(selectedSlot?.startTime
          ? { selectedSlotStart: selectedSlot.startTime }
          : {}),
      };
    },
    [
      selectedDate,
      selectedFormat,
      selectedSlotId,
      selectedServiceId,
      selectedTherapistId,
      visibleSlots,
    ],
  );

  const value = useMemo<BookingWidgetState>(
    () => ({
      selectedServiceId,
      selectedTherapistId,
      selectedFormat,
      selectedDate,
      selectedSlotId,
      calendarOpen,
      notifyOpen,
      month,
      availableDates: dates,
      visibleSlots,
      setSelectedServiceId,
      setSelectedTherapistId,
      setSelectedFormat,
      setSelectedDate: selectDate,
      setSelectedSlotId,
      setCalendarOpen,
      setNotifyOpen,
      setMonth,
      resetSelection,
      buildSubmitPayload,
    }),
    [
      buildSubmitPayload,
      calendarOpen,
      dates,
      month,
      notifyOpen,
      resetSelection,
      selectDate,
      selectedDate,
      selectedFormat,
      selectedServiceId,
      selectedSlotId,
      selectedTherapistId,
      visibleSlots,
    ],
  );

  return (
    <BookingWidgetContext.Provider value={value}>
      {children}
    </BookingWidgetContext.Provider>
  );
}
