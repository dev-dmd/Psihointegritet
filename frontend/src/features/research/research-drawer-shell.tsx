"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";

interface ResearchDrawerShellProps {
  open: boolean;
  labelledBy: string;
  onClose: () => void;
  children: ReactNode;
}

function ResearchDrawerPanel({
  labelledBy,
  onClose,
  children,
}: Omit<ResearchDrawerShellProps, "open">) {
  const drawerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    const previousOverflow = document.body.style.overflow;
    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    drawerRef.current?.focus();

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  return (
    <>
      <div
        aria-hidden
        onClick={onClose}
        className="bg-coffee/50 animate-fade-in fixed inset-0 z-[80]"
      />
      <div
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        tabIndex={-1}
        className="bg-canvas shadow-drawer animate-drawer-in fixed top-0 right-0 bottom-0 z-[81] flex w-[min(520px,100vw)] flex-col outline-none"
      >
        {children}
      </div>
    </>
  );
}

/**
 * Research-owned modal shell. It is deliberately separate from the resizable
 * Compass sheet: every Research survey is a full-height right drawer,
 * regardless of which product surface launches it.
 */
export function ResearchDrawerShell({
  open,
  ...props
}: ResearchDrawerShellProps) {
  if (!open || typeof document === "undefined") return null;

  return createPortal(<ResearchDrawerPanel {...props} />, document.body);
}
