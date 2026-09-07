"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

/**
 * Who may open the booking form, and how.
 *
 * Nine places on this page open it — header, hero, bio, methodology, both
 * service cards, the video CTA strip, FAQ, footer, the drawer and the sticky
 * bar. Threading a callback through eleven levels of section props would make
 * every section in between care about a modal it does not render.
 *
 * A context instead, so a section stays a **server component** and only the
 * button inside it is client code. That is what keeps this page prerendered:
 * the copy, the layout and the images are static, and the interactive surface
 * is a handful of buttons.
 */
interface BookingControls {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  /**
   * Whether the drawer is up. Held here rather than only in the header because
   * the sticky bar has to stand down for *either* overlay, and routing that
   * boolean back down through the page would put a prop on every section
   * between them.
   */
  drawerOpen: boolean;
  setDrawerOpen: (open: boolean) => void;
  /** Either overlay. The one thing the sticky bar actually asks. */
  overlayOpen: boolean;
}

const BookingContext = createContext<BookingControls | null>(null);

export function BookingProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);

  const value = useMemo(
    () => ({
      isOpen,
      open,
      close,
      drawerOpen,
      setDrawerOpen,
      overlayOpen: isOpen || drawerOpen,
    }),
    [isOpen, open, close, drawerOpen],
  );

  return (
    <BookingContext.Provider value={value}>{children}</BookingContext.Provider>
  );
}

/**
 * Throws when used outside the provider, deliberately.
 *
 * A silent no-op would mean a CTA that looks like a button and does nothing —
 * the single worst failure this page can have, and one nobody would notice in
 * review.
 */
export function useBooking(): BookingControls {
  const controls = useContext(BookingContext);
  if (!controls) {
    throw new Error(
      "useBooking() outside <BookingProvider>. Every booking CTA on Sanja's landing page must render inside it.",
    );
  }
  return controls;
}
