"use client";

import { useClerk } from "@clerk/nextjs";
import { Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/react";
import { PowerIcon } from "@heroicons/react/24/outline";

interface LogoutAvatarMenuProps {
  /** Initials shown on the trigger (e.g. "A", "SA", or real user initials). */
  initials: string;
  /** Accessible name for the trigger button. */
  label: string;
  /** Full class list for the trigger button — callers own the theming. */
  triggerClassName: string;
}

/**
 * Avatar trigger that opens a single-item dropdown ("Odjavi se"). Desktop
 * sidebars (Control Center, Superadmin) already expose sign-out as a
 * standalone icon button next to the avatar row; dashboards collapse that
 * sidebar below `lg`, so this is the mobile-topbar equivalent — same action,
 * reached by tapping the avatar instead.
 */
export function LogoutAvatarMenu({
  initials,
  label,
  triggerClassName,
}: LogoutAvatarMenuProps) {
  const { signOut } = useClerk();

  return (
    <Menu as="div" className="relative">
      <MenuButton aria-label={label} title={label} className={triggerClassName}>
        {initials}
      </MenuButton>

      <MenuItems
        transition
        className="ease-soft border-coffee/10 bg-surface absolute top-[calc(100%+10px)] right-0 z-[70] w-44 origin-top-right rounded-2xl border p-1.5 shadow-xl outline-none transition duration-200 data-[closed]:-translate-y-2 data-[closed]:scale-95 data-[closed]:opacity-0"
      >
        <MenuItem>
          <button
            type="button"
            onClick={() => signOut({ redirectUrl: "/" })}
            className="text-danger data-[focus]:bg-danger/10 flex w-full cursor-pointer items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-[13.5px] font-bold transition-colors"
          >
            <PowerIcon className="size-4 shrink-0" />
            Odjavi se
          </button>
        </MenuItem>
      </MenuItems>
    </Menu>
  );
}
