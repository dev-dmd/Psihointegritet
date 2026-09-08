"use client";

import { useEffect, type RefObject } from "react";

/**
 * Show the bottom CTA bar between the hero and the closing block.
 *
 * **Writes to a ref, not to state, and the element is never unmounted.** Both
 * are deliberate. An unmounted element cannot animate out, so hiding it by
 * conditional render would make it vanish rather than slide away; and driving a
 * scroll listener through React state would re-render the page on every frame
 * of a scroll.
 *
 * Hidden while the modal or the drawer is open — a bar sliding around behind a
 * scrim is noise, and it would sit above the overlay's own controls.
 */
export function useStickyCta(
  ref: RefObject<HTMLElement | null>,
  suppressed: boolean,
): void {
  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const sync = () => {
      const hero = document.getElementById("top");
      const closing = document.getElementById("kontakt");
      const pastHero = hero ? hero.getBoundingClientRect().bottom < 0 : false;
      const atClosing = closing
        ? closing.getBoundingClientRect().top < window.innerHeight
        : false;
      const show = pastHero && !atClosing && !suppressed;

      element.style.transform = show ? "translateY(0)" : "translateY(140%)";
      element.style.opacity = show ? "1" : "0";
      element.style.pointerEvents = show ? "auto" : "none";
    };

    sync();
    window.addEventListener("scroll", sync, { passive: true });
    window.addEventListener("resize", sync);
    return () => {
      window.removeEventListener("scroll", sync);
      window.removeEventListener("resize", sync);
    };
  }, [ref, suppressed]);
}
