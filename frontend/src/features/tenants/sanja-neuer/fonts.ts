import { Playfair_Display } from "next/font/google";

/**
 * The display face for this tenant, and only this tenant.
 *
 * Declared here rather than in the root layout so the founding tenant's pages
 * do not download a face they never render. `next/font` scopes to whatever
 * subtree carries the class, which is exactly the tenant boundary we want.
 *
 * **`latin-ext` is required, not optional.** Serbian Latin needs `č ć š ž đ`,
 * and the `latin` subset alone drops them — the page would render with a
 * fallback serif for every word carrying a diacritic. The design notes record
 * that an earlier, lighter serif was rejected for exactly this reason: its
 * carons detached at display sizes.
 */
export const sanjaDisplay = Playfair_Display({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500"],
  style: ["normal", "italic"],
  display: "swap",
  variable: "--font-playfair",
});
