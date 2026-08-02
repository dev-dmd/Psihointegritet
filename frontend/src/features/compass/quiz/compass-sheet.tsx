"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

/** Past this many pixels of downward drag the sheet closes on release. */
const CLOSE_THRESHOLD_PX = 110;

interface SheetProps {
  labelledBy: string;
  onClose: () => void;
  children: ReactNode;
}

/**
 * The panel itself, mounted only while the sheet is open.
 *
 * Keeping it in its own component is what lets drag state reset on close
 * without an effect: unmounting discards it. `isDragging` is state rather than
 * a ref because the render reads it to decide whether the transform animates.
 */
function SheetPanel({ labelledBy, onClose, children }: SheetProps) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const dragStartRef = useRef<number | null>(null);
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panelRef.current?.focus();

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  /** Pointer events cover mouse, touch and pen with one code path. */
  const startDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    dragStartRef.current = event.clientY;
    setIsDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const moveDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    const start = dragStartRef.current;
    if (start === null) return;
    // Downward only: dragging up must not lift the sheet past its own top.
    setDragOffset(Math.max(0, event.clientY - start));
  };

  const endDrag = () => {
    if (dragStartRef.current === null) return;
    dragStartRef.current = null;
    setIsDragging(false);
    if (dragOffset > CLOSE_THRESHOLD_PX) {
      onClose();
      return;
    }
    setDragOffset(0);
  };

  return (
    <>
      <div
        className="bg-coffee/45 fixed inset-0 z-[80] backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        tabIndex={-1}
        style={{
          transform: `translateY(${dragOffset}px)`,
          transition: isDragging ? "none" : "transform 200ms",
        }}
        className="bg-panel-canvas animate-fade-up fixed inset-x-0 bottom-0 z-[81] flex h-[60dvh] flex-col rounded-t-[24px] shadow-[0_-24px_64px_rgba(58,46,40,0.25)] outline-none"
      >
        <div
          onPointerDown={startDrag}
          onPointerMove={moveDrag}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          className="flex shrink-0 cursor-grab touch-none justify-center pt-3 pb-2 active:cursor-grabbing"
        >
          {/* Decorative on purpose: dragging duplicates Escape, the backdrop
              and the close button, so it adds no keyboard-only capability. */}
          <span className="bg-coffee/20 h-1.5 w-12 rounded-full" aria-hidden />
        </div>
        {children}
      </div>
    </>
  );
}

/**
 * Bottom sheet for the Kompas flow.
 *
 * Full viewport width at every breakpoint with rounded top corners, and a
 * **fixed 60dvh height** so the panel does not resize as questions with
 * different option counts come and go — the footer stays exactly where the hand
 * expects it.
 *
 * Portals to `document.body`: a sheet rendered inside a transformed or
 * backdrop-filtered ancestor loses `position: fixed`, which is exactly the trap
 * this site's sticky header creates.
 */
export function CompassSheet({
  open,
  ...props
}: SheetProps & { open: boolean }) {
  if (!open || typeof document === "undefined") return null;
  return createPortal(<SheetPanel {...props} />, document.body);
}
