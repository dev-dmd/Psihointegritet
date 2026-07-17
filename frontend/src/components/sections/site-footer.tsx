import type { Route } from "next";
import Link from "next/link";

import { footerServiceLinks, navLinks } from "@/content/homepage";

const footerNavLinks = navLinks.filter((link) => link.href !== "/#onama");

export function SiteFooter() {
  return (
    <footer id="kontakt" className="bg-forest scroll-mt-24">
      <div className="mx-auto max-w-[1536px] px-5 pt-[72px] pb-10 md:px-8">
        <div className="border-canvas/12 grid grid-cols-1 gap-9 border-b pb-14 md:grid-cols-[5fr_3fr_3fr] md:gap-16">
          <div>
            <div className="mb-4 flex items-baseline">
              <span className="text-canvas font-serif text-[26px] font-medium">
                Psihointegritet
              </span>
              <span
                aria-hidden
                className="bg-warm ml-[5px] inline-block h-1.5 w-1.5 rounded-full"
              />
            </div>
            <p className="text-canvas/62 mb-6 max-w-[340px] text-[15px] leading-[1.65]">
              Digitalni centar za mentalno zdravlje. Psihoterapija,
              savjetovanje, radionice i edukativni sadržaji — na jednom mjestu.
            </p>
            <div className="text-canvas/55 text-sm leading-[1.9]">
              Niš · online i uživo
              <br />
              <a
                href="mailto:kontakt@psihointegritet.rs"
                className="text-canvas/80 hover:text-meadow no-underline transition-colors duration-200"
              >
                kontakt@psihointegritet.rs
              </a>
            </div>
          </div>
          <div>
            <div className="text-sage mb-[18px] text-[11.5px] font-semibold tracking-[0.14em] uppercase">
              Navigacija
            </div>
            <div className="flex flex-col gap-3">
              {footerNavLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href as Route}
                  className="text-canvas/75 hover:text-meadow text-[15px] no-underline transition-colors duration-200"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
          <div>
            <div className="text-sage mb-[18px] text-[11.5px] font-semibold tracking-[0.14em] uppercase">
              Usluge
            </div>
            <div className="flex flex-col gap-3">
              {footerServiceLinks.map((link) => (
                <Link
                  key={link.label}
                  href={link.href as Route}
                  className="text-canvas/75 hover:text-meadow text-[15px] no-underline transition-colors duration-200"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-6 pt-7">
          <div className="text-canvas/45 text-[13px]">
            © 2026 Psihointegritet. Sva prava zadržana.
          </div>
          <div className="text-canvas/40 max-w-[520px] text-[12.5px]">
            Sadržaji na ovoj stranici imaju edukativnu svrhu i ne predstavljaju
            zamjenu za individualni razgovor sa stručnom osobom.
          </div>
        </div>
      </div>
    </footer>
  );
}
