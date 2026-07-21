import type { Route } from "next";
import type { ComponentType, SVGProps } from "react";

import {
  BellIcon,
  BuildingIcon,
  CalendarIcon,
  ChartIcon,
  ClientsIcon,
  GridIcon,
  PinIcon,
  SlidersIcon,
  TagIcon,
  TeamIcon,
  UserIcon,
} from "./components/icons";

/**
 * Control Center navigation, role-gated. `visibleNav` derives the items a
 * given role sees — the single source the sidebar, bottom nav and their tests
 * all read. It mirrors the server-side page guards (`requireOrgAdmin` /
 * `requireTherapist`); the guard is the authority, this is only the display.
 */

export type NavRequire = "any" | "admin" | "therapist";

type IconComponent = ComponentType<SVGProps<SVGSVGElement> & { size?: number }>;

export interface NavItem {
  href: Route;
  label: string;
  icon: IconComponent;
  requires: NavRequire;
  /** Mono/warm count badge key. */
  badge?: "requests";
  /** Muted „Uskoro" item (planned modules). */
  soon?: boolean;
}

export interface NavSection {
  caption?: string;
  items: NavItem[];
}

const SECTIONS: NavSection[] = [
  {
    items: [
      {
        href: "/radni-prostor",
        label: "Pregled",
        icon: GridIcon,
        requires: "any",
      },
      {
        href: "/radni-prostor/termini",
        label: "Termini",
        icon: CalendarIcon,
        requires: "any",
        badge: "requests",
      },
      {
        href: "/radni-prostor/klijenti",
        label: "Klijenti",
        icon: ClientsIcon,
        requires: "any",
      },
      {
        href: "/radni-prostor/kompanije",
        label: "Kompanije",
        icon: BuildingIcon,
        requires: "admin",
      },
    ],
  },
  {
    caption: "Poslovanje",
    items: [
      {
        href: "/radni-prostor/usluge",
        label: "Usluge i cene",
        icon: TagIcon,
        requires: "admin",
      },
      {
        href: "/radni-prostor/istrazivanja",
        label: "Istraživanja",
        icon: ChartIcon,
        requires: "admin",
      },
    ],
  },
  {
    caption: "Tim",
    items: [
      {
        href: "/radni-prostor/terapeuti",
        label: "Terapeuti",
        icon: TeamIcon,
        requires: "admin",
      },
      {
        href: "/radni-prostor/profil",
        label: "Moj profil",
        icon: UserIcon,
        requires: "therapist",
      },
    ],
  },
  {
    caption: "Podešavanja",
    items: [
      {
        href: "/radni-prostor/podesavanja",
        label: "Lokacije i način rada",
        icon: PinIcon,
        requires: "admin",
        soon: true,
      },
      {
        href: "/radni-prostor/podesavanja",
        label: "Obaveštenja",
        icon: BellIcon,
        requires: "admin",
        soon: true,
      },
      {
        href: "/radni-prostor/podesavanja",
        label: "Podešavanja centra",
        icon: SlidersIcon,
        requires: "admin",
        soon: true,
      },
    ],
  },
];

export interface RoleFlags {
  isAdmin: boolean;
  isTherapist: boolean;
}

function canSee(requires: NavRequire, flags: RoleFlags): boolean {
  if (requires === "any") return true;
  if (requires === "admin") return flags.isAdmin;
  return flags.isTherapist;
}

/** Sections (and their items) visible to the given role. Empty sections drop. */
export function visibleNav(flags: RoleFlags): NavSection[] {
  return SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter((item) => canSee(item.requires, flags)),
  })).filter((section) => section.items.length > 0);
}

/** Bottom-nav order (mobile): Pregled, Termini, Klijenti — plus the FAB and „Više". */
export const bottomNavItems: NavItem[] = SECTIONS[0]!.items.filter(
  (item) => item.requires === "any",
);
