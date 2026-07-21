import type { Config } from "tailwindcss";

/**
 * Flexio Lingua — AI Language Tutor
 * Design tokens derived from the Figma file + reference image.
 * Drop these into your Next.js tailwind.config.ts.
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
        // Brand purple
        primary: {
          DEFAULT: "#7C4DFF",
          light: "#9747FF",
          deep: "#6F00FF",
          50: "#EFEBFF", // icon tile / soft background
        },
        // Surfaces
        card: "#F3F6FB", // light card / input background
        ink: "#1E1E22", // primary text
        muted: "#9C9BC2", // secondary text / meta
        muted2: "#6B7280", // body copy
        track: "#E1E6EE", // progress ring / track background
        line: "#EDEFF4", // hairline dividers
        danger: "#EF5E5E", // delete / log out
        success: "#22B07D", // online / correct
      },
      fontFamily: {
        // Headings + UI
        sans: ["Overpass", "system-ui", "sans-serif"],
        // Body copy / labels
        body: ["Inter", "system-ui", "sans-serif"],
      },
      borderRadius: {
        card: "16px",
        tile: "14px",
        pill: "999px",
        sheet: "30px", // bottom drawer / sheet
        phone: "36px",
      },
      boxShadow: {
        soft: "0 18px 40px -22px rgba(124,77,255,0.45)", // primary buttons / glow
        card: "0 10px 30px -18px rgba(30,30,34,0.25)", // floating chips / bells
        tile: "0 6px 14px -8px rgba(124,77,255,0.60)", // icon tiles
      },
      backgroundImage: {
        "brand-gradient":
          "linear-gradient(120deg, #9747FF, #6F00FF)",
        "banner-gradient":
          "linear-gradient(125deg, #9747FF, #6F00FF)",
      },
    },
  },
  plugins: [],
};

export default config;
