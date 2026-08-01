import type { Config } from "tailwindcss";

/**
 * Psihointegritet — Control Center / Superadmin / Klijentski panel
 * Design tokeni izvedeni iz odobrenih public stranica (CLAUDE.md paleta).
 * Ubaciti u Next.js tailwind.config.ts.
 */
const config: Config = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Brand
        forest: { DEFAULT: "#2E3B2E", hover: "#3D4D3D" },   // primarna tamnozelena — sidebar admin, primarna dugmad
        sage: "#8A9D82",                                     // sekundarna — eyebrow, ikonice, progress fill
        meadow: "#C6D5A8",                                   // svetlozeleni akcenat — aktivna stanja, CTA na tamnom
        warm: "#D1A48C",                                     // topli akcenat — bedževi za pažnju, superadmin akcenat
        coffee: "#3A2E28",                                   // primarni tekst; sidebar superadmina
        canvas: "#FAF8F3",                                   // glavna pozadina
        surface: "#FFFFFF",                                  // kartice
        shell: "#EDE9DF",                                    // pozadina oko mobilne kolone (klijentski panel)
        danger: "#B3402E",                                   // destruktivne akcije / otkazano

        // Statusne boje (tekst; pozadine su iste boje sa alfa — vidi globals.css)
        "st-ok": "#3D6B3D",        // potvrđen / aktivan / operativan / održan
        "st-wait": "#96562F",      // čeka potvrdu / zahtev / novi upit / degradiran
        "st-soft": "#5E6F4A",      // predložena izmena / pilot
        "st-amber": "#8A6A3B",     // u pripremi / ponuda poslata

        line: "rgba(58,46,40,0.06)",       // border kartica
        "line-strong": "rgba(58,46,40,0.14)", // border pilula/inputa
        "ink-70": "rgba(58,46,40,0.7)",
        "ink-55": "rgba(58,46,40,0.55)",
        "ink-45": "rgba(58,46,40,0.45)",
      },
      fontFamily: {
        // Naslovi, veliki brojevi, imena — serif
        serif: ["var(--font-newsreader)", "Newsreader", "Georgia", "serif"],
        // UI, body, labele
        sans: ["var(--font-instrument)", "Instrument Sans", "system-ui", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"], // tehničke vrednosti u superadminu
      },
      borderRadius: {
        tile: "14px",   // ikon-pločice, inputi, mini kartice u nedeljnom prikazu
        card: "20px",   // standardna kartica
        panel: "22px",  // veće sekcijske kartice
        hero: "24px",   // istaknute tamne kartice
        sheet: "26px",  // bottom sheet (gornji uglovi)
        pill: "999px",  // dugmad, bedževi, tabovi
      },
      boxShadow: {
        card: "0 14px 34px rgba(58,46,40,0.10)",      // hover kartica
        drawer: "-24px 0 64px rgba(58,46,40,0.25)",   // desni drawer (desktop)
        sheet: "0 -18px 48px rgba(58,46,40,0.25)",    // bottom sheet
        fab: "0 10px 24px rgba(46,59,46,0.35)",       // centralno + dugme u mobilnoj navigaciji
        modal: "0 32px 80px rgba(58,46,40,0.3)",
        col: "0 30px 80px -30px rgba(58,46,40,0.35)", // centrirana app kolona (klijentski panel)
      },
      maxWidth: {
        content: "1160px", // max širina sadržaja admin/superadmin panela
        app: "480px",      // širina mobilne kolone klijentskog panela
      },
      spacing: {
        sidebar: "264px",  // širina leve navigacije
      },
    },
  },
  plugins: [],
};

export default config;
