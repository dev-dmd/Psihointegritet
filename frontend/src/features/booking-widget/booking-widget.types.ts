import type { ReactNode } from "react";

export type BookingWidgetVariant = "glass" | "light" | "dark";

export type BookingFormat = "online" | "uzivo";

export interface BookingWidgetTheme {
  root: string;
  panel: string;
  brandPanel: string;
  contentPanel: string;
  heading: string;
  body: string;
  muted: string;
  serviceMeta: string;
  brandSubtitle: string;
  contentBlob: string;
  showContentBlob: boolean;
  border: string;
  primaryButton: string;
  secondaryButton: string;
  slot: string;
  selectedSlot: string;
  disabledSlot: string;
  switchTrack: string;
  switchActive: string;
  calendarSelectedDay: string;
  calendarAvailableDay: string;
  calendarDisabledDay: string;
}

export interface BookingService {
  id: string;
  slug: string;
  name: string;
  durationMinutes: number;
  price: number;
  currency: string;
  formats: BookingFormat[];
}

export interface BookingTherapist {
  id: string;
  slug: string;
  name: string;
  avatarUrl?: string;
}

export interface BookingSlot {
  id: string;
  /** Local calendar date in ISO form: YYYY-MM-DD. */
  date: string;
  startTime: string;
  endTime: string;
  available: boolean;
}

export interface BookingWidgetCopy {
  title: string;
  requestNotice: string;
  nextAvailableLabel: string;
  cancelLabel: string;
  notifyLabel: string;
  bookLabel: string;
  onlineLabel: string;
  inPersonLabel: string;
}

export interface BookingWidgetBrand {
  name: string;
  subtitle: string;
  logoUrl?: string;
}

export interface BookingWidgetSubmitPayload {
  serviceId: string;
  therapistId?: string;
  format: BookingFormat;
  slotId?: string;
  selectedDate?: string;
}

export interface BookingWidgetProps {
  variant: BookingWidgetVariant;
  brand: BookingWidgetBrand;
  service: BookingService;
  therapist?: BookingTherapist;
  initialFormat?: BookingFormat;
  slots: BookingSlot[];
  copy?: Partial<BookingWidgetCopy>;
  showBrandPanel?: boolean;
  showTherapist?: boolean;
  showNotifyAction?: boolean;
  onCancel?: () => void;
  onNotify?: () => void;
  onSubmit?: (payload: BookingWidgetSubmitPayload) => void;
  /** Optional placement hook for host applications, never used for state. */
  className?: string;
}

export interface BookingWidgetLayoutProps {
  children: ReactNode;
  brand: BookingWidgetBrand;
  showBrandPanel: boolean;
  theme: BookingWidgetTheme;
  variant: BookingWidgetVariant;
  className?: string;
}

export interface BookingWidgetSearchContext {
  serviceSlug: string | null;
  therapistSlug: string | null;
  format: BookingFormat | null;
  source: string | null;
}
