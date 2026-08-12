"use client";

import {
  createContext,
  useCallback,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  findOfferingById,
  offeringsForTherapist,
  resolveCompatibleOffering,
  therapistIdsWithOfferings,
} from "@/features/booking/booking-offering";

import {
  availableDateKeys,
  firstAvailableDate,
  toLocalDate,
} from "../booking-widget.config";
import type {
  BookingFormat,
  BookingSlot,
  BookingWidgetOffering,
  BookingWidgetSubmitPayload,
} from "../booking-widget.types";

/**
 * One selection, one authority.
 *
 * `therapistId` + `offeringId` are the only stored selection values; the
 * service, the format, the price and the duration are all read off the active
 * offering. That is what makes the invalid state „therapist A + a service A
 * does not provide" unrepresentable rather than merely guarded against.
 */
export interface BookingSelection {
  therapistId: string | null;
  offeringId: string | null;
  slotId: string | null;
}

export interface BookingWidgetState {
  selection: BookingSelection;
  activeOffering: BookingWidgetOffering | null;
  availableOfferings: BookingWidgetOffering[];
  otherTherapistIds: string[];
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
  selectTherapist: (therapistId: string) => void;
  selectOffering: (offeringId: string) => void;
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
  offerings: BookingWidgetOffering[];
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

/**
 * Resolves the opening selection from whatever the entry point supplied.
 *
 * A missing or unknown therapist falls back to the first therapist who has
 * offerings at all, so the widget always opens on a valid pair instead of an
 * empty „the team will suggest someone" state that cannot list services.
 */
function initialSelection(
  offerings: BookingWidgetOffering[],
  initialTherapistId: string | undefined,
  initialServiceId: string | undefined,
  initialFormat: BookingFormat | undefined,
): BookingSelection {
  const therapistId =
    initialTherapistId &&
    offeringsForTherapist(offerings, initialTherapistId).length > 0
      ? initialTherapistId
      : (therapistIdsWithOfferings(offerings)[0] ?? null);

  if (therapistId === null) {
    return { therapistId: null, offeringId: null, slotId: null };
  }

  const offering = resolveCompatibleOffering(offerings, {
    therapistId,
    serviceId: initialServiceId ?? null,
    format: initialFormat ?? null,
  });

  return { therapistId, offeringId: offering?.id ?? null, slotId: null };
}

export function BookingWidgetProvider({
  offerings,
  initialServiceId,
  initialTherapistId,
  initialFormat,
  slots,
  children,
}: BookingWidgetProviderProps) {
  const [selection, setSelection] = useState<BookingSelection>(() =>
    initialSelection(
      offerings,
      initialTherapistId,
      initialServiceId,
      initialFormat,
    ),
  );
  const [selectedDate, setSelectedDate] = useState<string | null>(() =>
    firstAvailableDate(slots),
  );
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [notifyOpen, setNotifyOpen] = useState(false);
  const [month, setMonth] = useState(() => initialMonth(slots));

  const activeOffering = useMemo(
    () => findOfferingById(offerings, selection.offeringId),
    [offerings, selection.offeringId],
  );

  const selectedFormat: BookingFormat =
    activeOffering?.format ?? initialFormat ?? "online";

  const availableOfferings = useMemo(
    () =>
      offeringsForTherapist(offerings, selection.therapistId, selectedFormat),
    [offerings, selectedFormat, selection.therapistId],
  );

  const otherTherapistIds = useMemo(
    () =>
      therapistIdsWithOfferings(offerings).filter(
        (id) => id !== selection.therapistId,
      ),
    [offerings, selection.therapistId],
  );

  const dates = useMemo(() => availableDateKeys(slots), [slots]);
  const visibleSlots = useMemo(
    () => slots.filter((slot) => slot.available && slot.date === selectedDate),
    [selectedDate, slots],
  );

  /**
   * Changing the therapist keeps the treatment when the new person provides a
   * compatible offering, and always drops the slot — a slot belongs to one
   * therapist and must never survive the switch (§8.5).
   */
  const selectTherapist = useCallback(
    (therapistId: string) => {
      setSelection((current) => {
        if (current.therapistId === therapistId) return current;
        const next = resolveCompatibleOffering(offerings, {
          therapistId,
          serviceId: activeOffering?.serviceId ?? null,
          format: selectedFormat,
        });
        return { therapistId, offeringId: next?.id ?? null, slotId: null };
      });
    },
    [activeOffering?.serviceId, offerings, selectedFormat],
  );

  /** Same therapist, different treatment — the slot still has to go (§9.3). */
  const selectOffering = useCallback((offeringId: string) => {
    setSelection((current) =>
      current.offeringId === offeringId
        ? current
        : { ...current, offeringId, slotId: null },
    );
  }, []);

  /**
   * Format is a property of the offering, so switching it re-resolves to the
   * same treatment in the requested format rather than keeping a stale row.
   */
  const handleFormatChange = useCallback(
    (format: BookingFormat) => {
      setSelection((current) => {
        if (current.therapistId === null) return current;
        const next = resolveCompatibleOffering(offerings, {
          therapistId: current.therapistId,
          serviceId: activeOffering?.serviceId ?? null,
          format,
        });
        if (next === null || next.id === current.offeringId) return current;
        return { ...current, offeringId: next.id, slotId: null };
      });
    },
    [activeOffering?.serviceId, offerings],
  );

  const selectDate = useCallback((date: string) => {
    setSelectedDate(date);
    setSelection((current) => ({ ...current, slotId: null }));
  }, []);

  const setSelectedSlotId = useCallback((slotId: string) => {
    setSelection((current) => ({ ...current, slotId }));
  }, []);

  const resetSelection = useCallback(() => {
    setSelection((current) => ({ ...current, slotId: null }));
    setSelectedDate(firstAvailableDate(slots));
  }, [slots]);

  const buildSubmitPayload = useCallback(
    (therapistId?: string): BookingWidgetSubmitPayload => {
      const slot = selection.slotId
        ? visibleSlots.find((candidate) => candidate.id === selection.slotId)
        : undefined;
      const resolvedTherapist = therapistId ?? selection.therapistId;
      return {
        serviceId: activeOffering?.serviceId ?? "",
        format: selectedFormat,
        ...(activeOffering ? { offeringId: activeOffering.id } : {}),
        ...(resolvedTherapist ? { therapistId: resolvedTherapist } : {}),
        ...(selection.slotId ? { slotId: selection.slotId } : {}),
        ...(selectedDate ? { selectedDate } : {}),
        ...(slot?.startTime ? { selectedSlotStart: slot.startTime } : {}),
      };
    },
    [
      activeOffering,
      selectedDate,
      selectedFormat,
      selection.slotId,
      selection.therapistId,
      visibleSlots,
    ],
  );

  const value = useMemo<BookingWidgetState>(
    () => ({
      selection,
      activeOffering,
      availableOfferings,
      otherTherapistIds,
      selectedServiceId: activeOffering?.serviceId ?? "",
      selectedTherapistId: selection.therapistId,
      selectedFormat,
      selectedDate,
      selectedSlotId: selection.slotId,
      calendarOpen,
      notifyOpen,
      month,
      availableDates: dates,
      visibleSlots,
      selectTherapist,
      selectOffering,
      setSelectedFormat: handleFormatChange,
      setSelectedDate: selectDate,
      setSelectedSlotId,
      setCalendarOpen,
      setNotifyOpen,
      setMonth,
      resetSelection,
      buildSubmitPayload,
    }),
    [
      activeOffering,
      availableOfferings,
      buildSubmitPayload,
      calendarOpen,
      dates,
      handleFormatChange,
      month,
      notifyOpen,
      otherTherapistIds,
      resetSelection,
      selectDate,
      selectOffering,
      selectTherapist,
      selectedDate,
      selectedFormat,
      selection,
      setSelectedSlotId,
      visibleSlots,
    ],
  );

  return (
    <BookingWidgetContext.Provider value={value}>
      {children}
    </BookingWidgetContext.Provider>
  );
}
