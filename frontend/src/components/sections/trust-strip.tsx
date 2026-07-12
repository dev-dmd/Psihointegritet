import { Reveal } from "@/components/motion/reveal";
import { trustItems, type TrustIcon } from "@/content/homepage";

const iconPaths: Record<TrustIcon, React.ReactNode> = {
  screen: (
    <>
      <rect x="2" y="4" width="20" height="13" rx="2" />
      <path d="M8 21h8M12 17v4" />
    </>
  ),
  pin: (
    <>
      <path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z" />
      <circle cx="12" cy="10" r="3" />
    </>
  ),
  people: (
    <>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </>
  ),
  shield: <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />,
};

export function TrustStrip() {
  return (
    <section className="scroll-mt-24 pt-[72px]">
      <div className="mx-auto max-w-[1536px] px-5 md:px-8">
        <Reveal>
          <div className="bg-forest grid grid-cols-1 gap-[18px] rounded-3xl px-6 py-[26px] sm:grid-cols-2 sm:gap-[22px] md:px-12 md:py-9 lg:grid-cols-4 lg:gap-8">
            {trustItems.map((item, index) => (
              <div
                key={item.icon}
                className={
                  index > 0
                    ? "lg:border-canvas/14 flex items-center gap-3.5 lg:border-l lg:pl-8"
                    : "flex items-center gap-3.5"
                }
              >
                <svg
                  aria-hidden
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--color-meadow)"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="shrink-0"
                >
                  {iconPaths[item.icon]}
                </svg>
                <span className="text-canvas text-[15px] font-medium">
                  {item.label}
                </span>
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
