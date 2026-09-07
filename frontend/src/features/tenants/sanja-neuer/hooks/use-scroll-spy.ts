"use client";

import { useEffect, useState } from "react";

/**
 * Which section the reader is looking at, for the header's active link.
 *
 * `rootMargin: -45% 0px -45% 0px` narrows the observer to a band across the
 * middle of the viewport, so a section counts as "current" when it is centred
 * rather than when it first peeks in. Without it every scroll crosses two
 * sections at once and the underline flickers between them.
 */
export function useScrollSpy(ids: readonly string[]): string | null {
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    const targets = ids
      .map((id) => document.getElementById(id))
      .filter((node): node is HTMLElement => node !== null);
    if (targets.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) setActiveId(visible.target.id);
      },
      { rootMargin: "-45% 0px -45% 0px" },
    );

    targets.forEach((target) => observer.observe(target));
    return () => observer.disconnect();
  }, [ids]);

  return activeId;
}
