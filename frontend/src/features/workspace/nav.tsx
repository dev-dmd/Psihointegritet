import type { ComponentType, SVGProps } from "react";

import type { PlatformRouteId } from "@/lib/routes/platform-routes";

import {
  BellIcon,
  BuildingIcon,
  CalendarIcon,
  ChartIcon,
  ClientsIcon,
  CompassIcon,
  DocumentIcon,
  GridIcon,
  LayersIcon,
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
  /**
   * Route identity, not a path. The sidebar builds the href through
   * `localizedPath(routeId, { locale })`, so one nav definition serves both
   * languages and the item lights from either locale's URL.
   */
  routeId: PlatformRouteId;
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
        routeId: "workspace.home",
        label: "Pregled",
        icon: GridIcon,
        requires: "any",
      },
      {
        routeId: "workspace.appointments.list",
        label: "Termini",
        icon: CalendarIcon,
        requires: "any",
        badge: "requests",
      },
      {
        routeId: "workspace.clients.list",
        label: "Klijenti",
        icon: ClientsIcon,
        requires: "any",
      },
      {
        routeId: "workspace.companies.list",
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
        routeId: "workspace.services.list",
        label: "Usluge i cene",
        icon: TagIcon,
        requires: "admin",
      },
      {
        routeId: "workspace.research",
        label: "Istraživanja",
        icon: ChartIcon,
        requires: "admin",
      },
      {
        routeId: "workspace.documents",
        label: "Dokumenti i saglasnosti",
        icon: DocumentIcon,
        requires: "admin",
      },
      {
        routeId: "workspace.content.list",
        label: "Sadržaj",
        icon: LayersIcon,
        requires: "admin",
      },
      {
        routeId: "workspace.compass.home",
        label: "Kompas",
        icon: CompassIcon,
        requires: "admin",
      },
    ],
  },
  {
    caption: "Tim",
    items: [
      {
        routeId: "workspace.therapists.list",
        label: "Terapeuti",
        icon: TeamIcon,
        requires: "admin",
      },
      {
        routeId: "workspace.profile",
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
        routeId: "workspace.settings.home",
        label: "Lokacije i način rada",
        icon: PinIcon,
        requires: "admin",
        soon: true,
      },
      {
        routeId: "workspace.settings.home",
        label: "Obaveštenja",
        icon: BellIcon,
        requires: "admin",
        soon: true,
      },
      {
        routeId: "workspace.settings.home",
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
