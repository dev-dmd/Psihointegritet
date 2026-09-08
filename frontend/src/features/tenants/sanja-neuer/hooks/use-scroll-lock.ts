"use client";

import { useEffect } from "react";

/**
 * Freeze the page behind an overlay, and put the reader back where they were.
 *
 * `position: fixed` on `<body>` rather than `overflow: hidden`, because iOS
 * Safari ignores the latter on the scrolling element. The cost of that trick is
 * that the page jumps to the top, so the offset is captured on lock and
 * restored on release.
 *
 * `scroll-behavior` is forced to `auto` for the restore: the page sets
 * `smooth` globally, and without this the reader watches it animate back to
 * where they already were.
 */
export function useScrollLock(locked: boolean): void {
  useEffect(() => {
    if (!locked) return;

    const body = document.body;
    const html = document.documentElement;
    const offset = window.scrollY || html.scrollTop || 0;

    body.style.position = "fixed";
    body.style.top = `${-offset}px`;
    body.style.left = "0";
    body.style.right = "0";
    body.style.width = "100%";

    return () => {
      body.style.position = "";
      body.style.top = "";
      body.style.left = "";
      body.style.right = "";
      body.style.width = "";

      const previous = html.style.scrollBehavior;
      html.style.scrollBehavior = "auto";
      window.scrollTo(0, offset);
      html.style.scrollBehavior = previous;
    };
  }, [locked]);
}
