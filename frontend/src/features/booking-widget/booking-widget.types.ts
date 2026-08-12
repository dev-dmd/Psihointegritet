import type { ReactNode } from "react";

import type { BookingSelectionPolicy } from "@/features/booking/booking-context";

export type { BookingSelectionPolicy };

export type BookingWidgetVariant = "glass" | "light" | "dark";

export type BookingFormat = "online" | "uzivo";

/**
 * Display projection of one `BookingOffering` (therapist × service × format).
 *
 * `serviceName` is the service's own name, not a formatted label — duration,
 * format and price labels are derived at render time and never stored here.
 */
export interface BookingWidgetOffering {
  id: string;
  therapistId: string;
  serviceId: string;
  serviceName: string;
  durationMinutes: number;
  format: BookingFormat;
  priceAmount: number;
  currency: string;
}

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
  /** Authored genitive first name for „Usluge kod {name}" — never built programmatically. */
  firstNameGenitive?: string;
  /** One short professional/modality line — enough to choose, nothing more. */
  title?: string;
  /** City shown only when in-person work is relevant. */
  city?: string;
  /** Service slugs this therapist provides (from catalog). */
  serviceSlugs?: string[];
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
  /**
   * „Usluge kod {name}" — interpolated, never assembled from a built
   * possessive. Serbian possessives differ per name and would not survive
   * translation or a new market.
   */
  offeringsHeadingTemplate: string;
  otherTherapistsLabel: string;
  yourSelectionLabel: string;
  /** Visible text on the back button — an arrow alone did not read as anything. */
  backLabel: string;
  /** Fuller accessible name; must contain `backLabel` (WCAG 2.5.3 Label in Name). */
  backAriaLabel: string;
  previousOfferingLabel: string;
  nextOfferingLabel: string;
  previousTherapistsLabel: string;
  nextTherapistsLabel: string;
  loadingOfferingsLabel: string;
  noOfferingsMessage: string;
  availabilityErrorMessage: string;
}

export interface BookingWidgetBrand {
  name: string;
  subtitle: string;
  logoUrl?: string;
}

export interface BookingWidgetSubmitPayload {
  serviceId: string;
  /** The offering the person actually chose; `serviceId` stays for API compatibility. */
  offeringId?: string;
  therapistId?: string;
  format: BookingFormat;
  slotId?: string;
  selectedDate?: string;
  /** The start time of the selected slot (HH:MM), if a slot was picked. */
  selectedSlotStart?: string;
}

export interface BookingWidgetProps {
  variant: BookingWidgetVariant;
  brand: BookingWidgetBrand;
  /** Every bookable therapist × service × format combination on offer. */
  offerings: BookingWidgetOffering[];
  /** All available therapists. */
  therapists: BookingTherapist[];
  /**
   * The only authority for what may be changed inside the widget. Components
   * read this — never `source` — so a new entry point cannot scatter
   * conditionals across the tree.
   */
  selectionPolicy: BookingSelectionPolicy;
  /** Pre-selected service id (optional). */
  initialServiceId?: string;
  /** Pre-selected therapist id (optional). */
  initialTherapistId?: string;
  initialFormat?: BookingFormat;
  /** Back control shown when the selection is locked (e.g. to matching results). */
  onBack?: () => void;
  backLabel?: string;
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
