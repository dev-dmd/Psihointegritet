import type { ComponentType, SVGProps } from "react";

import type { PlatformRouteId } from "@/lib/routes/platform-routes";
import type { EnWorkspace } from "@/messages/en/workspace";

type NavLabelKey = Exclude<
  keyof EnWorkspace["nav"],
  "sections" | "more" | "soon" | "hasError"
>;
type NavSectionKey = keyof EnWorkspace["nav"]["sections"];

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
  /**
   * Key into the `workspace.nav` namespace, not a rendered string.
   *
   * Named after the screen rather than its current wording, so renaming
   * „Usluge i cene" is a catalogue edit and touches nothing here.
   */
  labelKey: NavLabelKey;
  icon: IconComponent;
  requires: NavRequire;
  /** Mono/warm count badge key. */
  badge?: "requests";
  /** Muted „Uskoro" item (planned modules). */
  soon?: boolean;
}

export interface NavSection {
  /** Key into `workspace.nav.sections`. Absent for the unnamed first block. */
  captionKey?: NavSectionKey;
  items: NavItem[];
}

const SECTIONS: NavSection[] = [
  {
    items: [
      {
        routeId: "workspace.home",
        labelKey: "home",
        icon: GridIcon,
        requires: "any",
      },
      {
        routeId: "workspace.appointments.list",
        labelKey: "appointments",
        icon: CalendarIcon,
        requires: "any",
        badge: "requests",
      },
      {
        routeId: "workspace.clients.list",
        labelKey: "clients",
        icon: ClientsIcon,
        requires: "any",
      },
      {
        routeId: "workspace.companies.list",
        labelKey: "companies",
        icon: BuildingIcon,
        requires: "admin",
      },
    ],
  },
  {
    captionKey: "business",
    items: [
      {
        routeId: "workspace.services.list",
        labelKey: "services",
        icon: TagIcon,
        requires: "admin",
      },
      {
        routeId: "workspace.research",
        labelKey: "research",
        icon: ChartIcon,
        requires: "admin",
      },
      {
        routeId: "workspace.documents",
        labelKey: "documents",
        icon: DocumentIcon,
        requires: "admin",
      },
      {
        routeId: "workspace.content.list",
        labelKey: "content",
        icon: LayersIcon,
        requires: "admin",
      },
      {
        routeId: "workspace.compass.home",
        labelKey: "compass",
        icon: CompassIcon,
        requires: "admin",
      },
    ],
  },
  {
    captionKey: "team",
    items: [
      {
        routeId: "workspace.therapists.list",
        labelKey: "therapists",
        icon: TeamIcon,
        requires: "admin",
      },
      {
        routeId: "workspace.profile",
        labelKey: "profile",
        icon: UserIcon,
        requires: "therapist",
      },
    ],
  },
  {
    captionKey: "settings",
    items: [
      {
        routeId: "workspace.settings.home",
        labelKey: "locations",
        icon: PinIcon,
        requires: "admin",
        soon: true,
      },
      {
        routeId: "workspace.settings.home",
        labelKey: "notifications",
        icon: BellIcon,
        requires: "admin",
        soon: true,
      },
      {
        routeId: "workspace.settings.home",
        labelKey: "centreSettings",
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
