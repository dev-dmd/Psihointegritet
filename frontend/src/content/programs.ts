import { formatRsd } from "@/content/currency";

export const GROUP_PRICE_PENDING = "Cena će biti objavljena naknadno.";

export type GroupProgramStatus = "announced" | "price-confirmed";

export interface GroupProgram {
  slug: string;
  title: string;
  audience: string;
  sessions: string;
  /** Session length / group size / format, shown only where confirmed. */
  details?: string;
  priceLine: string;
  note?: string;
  /** Public program details are announced, but no enrollment date is confirmed. */
  status: GroupProgramStatus;
  audienceTags: readonly string[];
}

/**
 * Group programs supplied by the team. None has a confirmed enrollment date,
 * facilitator, capacity or cancellation policy, so none exposes an active
 * registration CTA in this iteration.
 */
export const groupPrograms: GroupProgram[] = [
  {
    slug: "postpartalni-period",
    title: "Sigurno kroz postpartalni period",
    audience: "Za žene u trudnoći i majke u prvoj godini nakon porođaja.",
    sessions: "8 susreta · 120 minuta",
    details: "8–12 učesnica · online ili uživo",
    priceLine: GROUP_PRICE_PENDING,
    status: "announced",
    audienceTags: ["roditelji", "postpartalni period"],
  },
  {
    slug: "roditeljstvo-0-3",
    title: "Roditeljstvo od 0 do 3 godine — Sigurna baza",
    audience: "Za roditelje dece od rođenja do treće godine.",
    sessions: "8 susreta · 120 minuta",
    details: "8–12 učesnika",
    priceLine: GROUP_PRICE_PENDING,
    status: "announced",
    audienceTags: ["roditelji", "0-3"],
  },
  {
    slug: "roditeljstvo-3-7",
    title: "Roditeljstvo od 3 do 7 godina — Razvoj kroz odnos",
    audience: "Za roditelje predškolske dece.",
    sessions: "8 susreta · 120 minuta",
    details: "8–12 učesnika",
    priceLine: GROUP_PRICE_PENDING,
    status: "announced",
    audienceTags: ["roditelji", "3-7"],
  },
  {
    slug: "roditeljstvo-7-12",
    title: "Roditeljstvo školskog deteta (7–12 godina)",
    audience: "Za roditelje dece školskog uzrasta.",
    sessions: "8 susreta",
    priceLine: GROUP_PRICE_PENDING,
    status: "announced",
    audienceTags: ["roditelji", "7-12"],
  },
  {
    slug: "roditelj-tinejdzera",
    title: "Roditelj tinejdžera",
    audience: "Podrška roditeljima adolescenata.",
    sessions: "8 susreta",
    priceLine: GROUP_PRICE_PENDING,
    status: "announced",
    audienceTags: ["roditelji", "tinejdžeri"],
  },
  {
    slug: "razumevanje-anksioznosti",
    title: "Razumevanje anksioznosti",
    audience:
      "Edukativno-iskustveni program za bolje razumevanje anksioznosti.",
    sessions: "8 susreta",
    priceLine: GROUP_PRICE_PENDING,
    status: "announced",
    audienceTags: ["odrasli"],
  },
  {
    slug: "tridesete",
    title: "Tridesete — Vreme promene",
    audience: "Za osobe koje prolaze kroz životnu tranziciju posle tridesete.",
    sessions: "8 susreta · 120 minuta",
    details: "8–12 učesnika · online ili uživo",
    priceLine: `${formatRsd(3500)} po susretu · ${formatRsd(25000)} ceo program`,
    note: `Napomena: cena od ${formatRsd(3500)} je po susretu, ne po roditelju — oba roditelja ili staratelji dolaze zajedno po ceni jednog učesnika (mama i tata = ${formatRsd(3500)}, ne 2×${formatRsd(3500)}).`,
    status: "price-confirmed",
    audienceTags: ["odrasli"],
  },
];

export function findGroupProgram(slug: string): GroupProgram | undefined {
  return groupPrograms.find((program) => program.slug === slug);
}

export function parentPrograms(): GroupProgram[] {
  return groupPrograms.filter((program) =>
    program.audienceTags.includes("roditelji"),
  );
}
