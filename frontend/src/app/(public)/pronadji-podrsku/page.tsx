import type { Metadata } from "next";

import { GuidanceFlow } from "@/features/guidance/guidance-flow";

export const metadata: Metadata = {
  title: "Pronađi podršku",
  description:
    "Kroz nekoliko kratkih pitanja dobijte objašnjiv predlog terapeuta i načina rada. Vođeni izbor nije dijagnostički alat.",
  alternates: { canonical: "/pronadji-podrsku" },
};

export default function FindSupportPage() {
  return <GuidanceFlow entry="page" surface="page" />;
}
