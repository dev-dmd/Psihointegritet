import { sanjaContent } from "@/features/tenants/sanja-neuer/content";

const { stats } = sanjaContent;

/**
 * The ink banner, with the strips that peek from behind it.
 *
 * Four strips, three above and one below, painted *behind* the banner — the
 * banner is `z-10` and the strips `z-0`. They are decoration only, so they are
 * `aria-hidden`: a screen reader announcing four empty spans before the numbers
 * would be noise.
 */
export function SanjaStats() {
  return (
    <div className="relative mx-auto max-w-[1180px] px-6">
      <span
        aria-hidden
        className="bg-sn-lilac absolute -top-[34px] right-6 z-0 block h-11 w-[132px] rounded-t-2xl"
      />
      <span
        aria-hidden
        className="bg-sn-burgundy absolute -top-[23px] right-6 z-0 block h-[33px] w-[196px] rounded-t-[18px]"
      />
      <span
        aria-hidden
        className="bg-sn-lilac absolute -top-3 right-6 z-0 block h-[23px] w-[268px] rounded-t-[20px]"
      />
      <span
        aria-hidden
        className="bg-sn-lilac absolute right-6 -bottom-3.5 z-0 block h-[26px] w-[196px] rounded-b-[20px]"
      />

      <div className="bg-sn-ink relative z-10 rounded-[22px]">
        {/* Plain divs, not a definition list: the number reads first visually
            but is the *description*, not the term, so `dl` markup here would
            either invert the semantics or need reversing purely for looks. */}
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,190px),1fr))] gap-[22px] px-8 py-[30px]">
          {stats.map((stat) => (
            <div key={stat.label} className="flex flex-col gap-1">
              <span className="font-sn-display text-sn-lilac text-[32px] leading-none">
                {stat.value}
              </span>
              <span className="text-sn-ivory/62 text-xs tracking-[0.12em] uppercase">
                {stat.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
