"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

/** Design default: the sheet opens at 60dvh on every breakpoint. */
export const COMPASS_SHEET_DEFAULT_DVH = 60;
/** Resize bounds. Below the minimum the footer would collide with the header;
 *  above the maximum the page behind it stops being visible at all, which is
 *  what tells people this is a sheet they can dismiss rather than a new page. */
const MIN_DVH = 28;
const MAX_DVH = 94;
/** One arrow-key press. Matches the design's keyboard step. */
const KEY_STEP_DVH = 6;
/** A downward drag past this, from the default height, closes the sheet. */
const CLOSE_THRESHOLD_DVH = 12;

interface SheetProps {
  labelledBy: string;
  onClose: () => void;
  /** Starting height in dvh; the user can resize from there. */
  initialHeightDvh?: number;
  children: ReactNode;
}

function clampDvh(value: number): number {
  return Math.min(MAX_DVH, Math.max(MIN_DVH, value));
}

/**
 * The panel itself, mounted only while the sheet is open.
 *
 * Keeping it in its own component is what lets drag state reset on close
 * without an effect: unmounting discards it. `isDragging` is state rather than
 * a ref because the render reads it to decide whether the height animates.
 */
function SheetPanel({
  labelledBy,
  onClose,
  initialHeightDvh = COMPASS_SHEET_DEFAULT_DVH,
  children,
}: SheetProps) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  /** Pointer origin and the height at grab time, so a drag is absolute rather
   *  than an accumulation of deltas that drifts over a long gesture. */
  const dragOriginRef = useRef<{ y: number; height: number } | null>(null);
  const [heightDvh, setHeightDvh] = useState(clampDvh(initialHeightDvh));
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
  const startDrag = (event: React.PointerEvent<HTMLElement>) => {
    dragOriginRef.current = { y: event.clientY, height: heightDvh };
    setIsDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const moveDrag = (event: React.PointerEvent<HTMLElement>) => {
    const origin = dragOriginRef.current;
    if (!origin) return;
    // Pull up grows, pull down shrinks — the panel is anchored to the bottom
    // edge, so its top edge is what follows the pointer.
    const deltaDvh = ((origin.y - event.clientY) / window.innerHeight) * 100;
    setHeightDvh(clampDvh(origin.height + deltaDvh));
  };

  const endDrag = () => {
    const origin = dragOriginRef.current;
    if (!origin) return;
    dragOriginRef.current = null;
    setIsDragging(false);
    // Dragging down from the default height is how a sheet is dismissed
    // everywhere else; from a height the user chose it only shrinks, so a
    // deliberate resize is never mistaken for a dismissal.
    if (
      origin.height <= COMPASS_SHEET_DEFAULT_DVH &&
      heightDvh <= origin.height - CLOSE_THRESHOLD_DVH
    ) {
      onClose();
    }
  };

  const resizeByKey = (event: React.KeyboardEvent<HTMLElement>) => {
    if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
    event.preventDefault();
    const step = event.key === "ArrowUp" ? KEY_STEP_DVH : -KEY_STEP_DVH;
    setHeightDvh((current) => clampDvh(current + step));
  };

  const rounded = Math.round(heightDvh);

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
          height: `${heightDvh}dvh`,
          transition: isDragging ? "none" : "height 220ms",
        }}
        className="bg-panel-canvas animate-fade-up fixed inset-x-0 bottom-0 z-[81] flex flex-col rounded-t-[24px] shadow-[0_-24px_64px_rgba(58,46,40,0.25)] outline-none"
      >
        <div className="flex shrink-0 items-center gap-2 px-5 pt-1.5 md:px-8">
          <button
            type="button"
            role="slider"
            aria-label="Visina prozora — prevucite ili koristite strelice"
            aria-valuemin={MIN_DVH}
            aria-valuemax={MAX_DVH}
            aria-valuenow={rounded}
            aria-valuetext={`${rounded} dvh`}
            onPointerDown={startDrag}
            onPointerMove={moveDrag}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            onKeyDown={resizeByKey}
            className="flex h-[30px] flex-1 cursor-grab touch-none items-center justify-center active:cursor-grabbing"
          >
            <span
              aria-hidden
              className={`h-[5px] w-14 rounded-full transition-colors ${
                isDragging ? "bg-forest" : "bg-coffee/24"
              }`}
            />
          </button>
          <span
            aria-hidden
            className="text-coffee/40 shrink-0 text-[11px] tracking-[0.06em] tabular-nums"
          >
            {rounded} dvh
          </span>
        </div>
        {children}
      </div>
    </>
  );
}

/**
 * Bottom sheet for the Kompas flow.
 *
 * Full viewport width at every breakpoint with rounded top corners, opening at
 * **60dvh** and freely resizable between 28 and 94 — a five-option question and
 * a results screen do not want the same amount of room, and the design settles
 * that by letting the reader decide rather than by picking one compromise.
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
