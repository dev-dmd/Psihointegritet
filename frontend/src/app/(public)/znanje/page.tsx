import type { Metadata } from "next";

import { KnowledgePage } from "@/components/sections/resources/knowledge-page";

export const metadata: Metadata = {
  title: "Znanje i resursi",
  description:
    "Stručni tekstovi, vodiči i edukativni materijali o mentalnom zdravlju — u pripremi. Psihointegritet, digitalni centar za mentalno zdravlje.",
  alternates: { canonical: "/znanje" },
};

export default function KnowledgeRoute() {
  return <KnowledgePage />;
}
