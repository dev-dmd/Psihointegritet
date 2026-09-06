import type { ComponentType, SVGProps } from "react";

import type { PlatformRouteId } from "@/lib/routes/platform-routes";
import type { EnAccount } from "@/messages/en/account";

import { BookIcon, CalendarIcon, HomeIcon, UserIcon } from "./components/icons";

/**
 * The client panel's four tabs („KP navigacija" in the design handoff).
 *
 * Route identities, never paths: the href is built per locale in the nav
 * component, so one definition serves `/nalog/termini` and `/account/appointments`
 * and the item lights from either.
 */

type IconComponent = ComponentType<SVGProps<SVGSVGElement> & { size?: number }>;

export interface AccountNavItem {
  routeId: PlatformRouteId;
  /** Key into the `account.nav` namespace, not a rendered string. */
  labelKey: keyof EnAccount["nav"];
  icon: IconComponent;
}

export const accountNavItems: AccountNavItem[] = [
  { routeId: "account.home", labelKey: "home", icon: HomeIcon },
  {
    routeId: "account.appointments",
    labelKey: "appointments",
    icon: CalendarIcon,
  },
  { routeId: "account.programs", labelKey: "programs", icon: BookIcon },
  { routeId: "account.profile", labelKey: "profile", icon: UserIcon },
];
