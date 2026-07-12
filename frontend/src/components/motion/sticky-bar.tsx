"use client";

import { useEffect, useState, type ReactNode } from "react";

import { cn } from "@/helpers/cn";

interface StickyBarProps {
  children: ReactNode;
}

/**
 * Fixed top-center pill that slides in once the page is scrolled past 50px.
 * The navigation content itself stays server-rendered and arrives as children.
 */
export function StickyBar({ children }: StickyBarProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setVisible(window.scrollY > 50);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  return (
    <div
      className={cn(
        "shadow-pill ease-soft fixed top-5 left-1/2 z-[65] flex -translate-x-1/2 items-center gap-[clamp(14px,1.3vw,24px)] rounded-full border border-white/35 bg-gray-400/32 py-2 pr-2 pl-[26px] whitespace-nowrap backdrop-blur-[14px] transition-transform duration-500",
        visible ? "translate-y-0" : "-translate-y-[220%]",
      )}
    >
      {children}
    </div>
  );
}
