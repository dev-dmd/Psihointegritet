"use client";

import { Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/react";
import { PowerIcon } from "@heroicons/react/24/outline";
import type { ReactNode } from "react";

import { useSignOut } from "@/lib/auth/session/use-sign-out";
import { useTranslations } from "next-intl";

interface LogoutAvatarMenuProps {
  /** Initials shown on the trigger when no profile photo is available. */
  initials: string;
  /** Accessible name for the trigger button. */
  label: string;
  /** Full class list for the trigger button — callers own the theming. */
  triggerClassName: string;
  /** Extra items rendered above the sign-out action (e.g. "Glavni sajt"). */
  children?: ReactNode;
}

/**
 * Avatar trigger that opens a dropdown ending in "Odjavi se". Desktop
 * sidebars (Control Center, Superadmin) already expose sign-out as a
 * standalone icon button next to the avatar row; dashboards collapse that
 * sidebar below `lg`, so this is the mobile-topbar equivalent — same action,
 * reached by tapping the avatar instead.
 *
 * Shows the person's initials. A photo used to come from the auth provider's
 * profile; with the provider gone there is no source for one, because an upload
 * flow of our own has never existed. When it does, it belongs here — as a prop
 * from the guarded parent, not as a client read.
 */
export function LogoutAvatarMenu({
  initials,
  label,
  triggerClassName,
  children,
}: LogoutAvatarMenuProps) {
  const t = useTranslations("common");
  const signOut = useSignOut();

  return (
    <Menu as="div" className="relative">
      <MenuButton aria-label={label} title={label} className={triggerClassName}>
        {initials}
      </MenuButton>

      <MenuItems
        transition
        className="ease-soft border-coffee/10 bg-surface absolute top-[calc(100%+10px)] right-0 z-[70] w-44 origin-top-right rounded-2xl border p-1.5 shadow-xl transition duration-200 outline-none data-[closed]:-translate-y-2 data-[closed]:scale-95 data-[closed]:opacity-0"
      >
        {children ? (
          <>
            {children}
            <div className="border-coffee/10 mx-2 my-1.5 border-t" />
          </>
        ) : null}
        <MenuItem>
          <button
            type="button"
            onClick={() => void signOut()}
            className="text-danger data-[focus]:bg-danger/10 flex w-full cursor-pointer items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-[13.5px] font-bold transition-colors"
          >
            <PowerIcon className="size-4 shrink-0" />
            {t("shell.signOut")}
          </button>
        </MenuItem>
      </MenuItems>
    </Menu>
  );
}
