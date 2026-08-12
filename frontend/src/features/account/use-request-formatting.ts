"use client";

import { useFormatter } from "next-intl";

/**
 * Date and time rendering for the client panel.
 *
 * `useFormatter`, never `new Intl.DateTimeFormat("sr-Latn-RS", …)`: the latter
 * pins the language *and* silently takes the runtime's timezone, so the server
 * (UTC) and the browser disagreed around midnight. Both come from the request
 * config here, where `timeZone` is set explicitly.
 */
export interface RequestFormatting {
  /** „Četvrtak, 24. jul · 17:00" — the headline form. */
  longDateTime: (iso: string) => string;
  /** „24. jul" — inline, inside a sentence. */
  shortDate: (iso: string) => string;
  /** The two lines of the date tile in a list row. */
  dayTile: (iso: string) => { month: string; day: string };
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function useRequestFormatting(): RequestFormatting {
  const format = useFormatter();

  return {
    longDateTime: (iso) => {
      const at = new Date(iso);
      const day = format.dateTime(at, {
        weekday: "long",
        day: "numeric",
        month: "long",
      });
      const time = format.dateTime(at, { hour: "2-digit", minute: "2-digit" });
      // Serbian renders weekdays and months lowercase; the design starts the
      // line with a capital because it is a headline, not a sentence fragment.
      return `${capitalize(day)} · ${time}`;
    },
    shortDate: (iso) =>
      format.dateTime(new Date(iso), { day: "numeric", month: "long" }),
    dayTile: (iso) => {
      const at = new Date(iso);
      return {
        month: format.dateTime(at, { month: "short" }),
        day: format.dateTime(at, { day: "numeric" }),
      };
    },
  };
}
