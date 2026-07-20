import { APP_VERSION } from "../data";

/** Formats today's date the way the prototype does (sr-Latn, capitalized). */
function formatToday(): string {
  const formatted = new Intl.DateTimeFormat("sr-Latn-RS", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

/** Sticky blurred topbar: date (desktop), status pill, version chip. */
export function SuperadminTopbar() {
  return (
    <header className="bg-panel-canvas/88 border-coffee/8 sticky top-0 z-40 flex items-center gap-3.5 border-b px-4 py-2.5 backdrop-blur-md md:px-8 md:py-3">
      <span className="flex items-center gap-2 lg:hidden">
        <span className="text-coffee font-serif text-xl font-medium">
          Psihointegritet
        </span>
        <span className="bg-warm text-coffee rounded-full px-2 py-[3px] text-[9px] font-bold tracking-[0.14em] uppercase">
          SA
        </span>
      </span>
      <span className="text-ink-55 hidden text-[13px] lg:inline">
        {formatToday()}
      </span>
      <span className="flex-1" />
      <span className="bg-badge-ok-bg text-badge-ok inline-flex items-center gap-[7px] rounded-full px-[13px] py-1.5 text-[9px] font-bold tracking-[0.1em] uppercase">
        <span
          aria-hidden
          className="bg-badge-ok h-[7px] w-[7px] rounded-full"
        />
        Svi sistemi operativni
      </span>
      <span className="border-coffee/10 text-coffee/50 bg-surface hidden rounded-full border px-3 py-[7px] font-mono text-[11.5px] lg:inline">
        {APP_VERSION}
      </span>
    </header>
  );
}
