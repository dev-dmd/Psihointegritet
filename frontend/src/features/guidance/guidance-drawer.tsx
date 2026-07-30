"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";

import type { GuidanceEntry } from "./guidance-context";
import { GuidanceFlow } from "./guidance-flow";

interface GuidanceDrawerProps {
  entry: GuidanceEntry;
  onClose: () => void;
}

/** Transitional wrapper around the shared route-level GuidanceFlow. */
export function GuidanceDrawer({ entry, onClose }: GuidanceDrawerProps) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return createPortal(
    <>
      <div
        aria-hidden
        onClick={onClose}
        className="bg-coffee/50 animate-fade-in fixed inset-0 z-[80]"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Vođeni izbor podrške"
        className="bg-canvas shadow-drawer animate-drawer-in fixed top-0 right-0 bottom-0 z-[81] w-[min(560px,100vw)]"
      >
        <GuidanceFlow entry={entry} surface="drawer" onClose={onClose} />
      </div>
    </>,
    document.body,
  );
}
