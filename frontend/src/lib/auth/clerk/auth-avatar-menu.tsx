"use client";

import Link from "next/link";

import { useClerk, useUser } from "@clerk/nextjs";
import { Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/react";
import {
  AdjustmentsHorizontalIcon,
  CalendarDaysIcon,
  PowerIcon,
  Squares2X2Icon,
} from "@heroicons/react/24/outline";

import { cn } from "@/helpers/cn";
import { getInitials } from "@/lib/auth/clerk/initials";
import {
  ACCOUNT_APPOINTMENTS_URL,
  ACCOUNT_SETTINGS_URL,
  ACCOUNT_URL,
} from "@/lib/auth/routes";

const ACCOUNT_LINKS = [
  { href: ACCOUNT_URL, label: "Moj panel", Icon: Squares2X2Icon },
  {
    href: ACCOUNT_APPOINTMENTS_URL,
    label: "Moji termini",
    Icon: CalendarDaysIcon,
  },
  {
    href: ACCOUNT_SETTINGS_URL,
    label: "Podešavanja",
    Icon: AdjustmentsHorizontalIcon,
  },
] as const;

/**
 * Signed-in header control: an initials avatar that opens an account dropdown.
 * A warm ring draws itself once when the avatar mounts (see `.auth-avatar-ring`
 * in globals.css) — the visual acknowledgement of a successful sign-in.
 *
 * We deliberately do not use Clerk's `<UserButton>`: the trigger, ring and menu
 * are custom so they match the glass header. Sign-out goes through
 * `useClerk().signOut` rather than `<SignOutButton>` so it stays a real
 * `<MenuItem>` (keyboard navigable, closes the menu). Headless UI's `<Menu>`
 * supplies outside-click / Escape dismissal and focus management for free.
 */
export function AuthAvatarMenu({ size = "md" }: { size?: "md" | "sm" }) {
  const { user } = useUser();
  const { signOut } = useClerk();

  const email = user?.primaryEmailAddress?.emailAddress;
  const initials = getInitials(user?.firstName, user?.lastName, email);
  const fullName = user?.fullName ?? email ?? "Vaš nalog";

  return (
    <Menu as="div" className="relative">
      <MenuButton
        aria-label="Otvori korisnički meni"
        className={cn(
          "text-forest focus-visible:ring-forest/35 relative flex cursor-pointer items-center justify-center rounded-full border border-white/35 bg-gray-400/30 font-semibold tracking-wide backdrop-blur-md transition-colors outline-none hover:bg-gray-400/45 focus-visible:ring-2",
          size === "md" ? "size-11 text-[13.5px]" : "size-[38px] text-[12px]",
        )}
      >
        {initials}
        <svg
          aria-hidden
          viewBox="0 0 44 44"
          fill="none"
          className="pointer-events-none absolute inset-0 size-full -rotate-90"
        >
          <circle
            cx="22"
            cy="22"
            r="21"
            strokeWidth="2"
            strokeLinecap="round"
            className="stroke-warm auth-avatar-ring"
          />
        </svg>
      </MenuButton>

      <MenuItems
        transition
        className="ease-soft absolute top-[calc(100%+12px)] right-0 z-[70] w-60 origin-top-right rounded-[18px] border border-white/40 bg-gray-400/40 p-2 shadow-xl backdrop-blur-xl transition duration-[280ms] outline-none data-[closed]:-translate-y-2 data-[closed]:scale-95 data-[closed]:opacity-0 motion-reduce:transition-none"
      >
        <div className="mb-1.5 border-b border-white/40 px-2 pt-1 pb-3">
          <p className="text-forest-soft text-[10.5px] font-medium tracking-[0.12em] uppercase">
            Vaš nalog
          </p>
          <p className="text-forest truncate font-serif text-[19px] leading-tight">
            {fullName}
          </p>
        </div>

        {ACCOUNT_LINKS.map(({ href, label, Icon }) => (
          <MenuItem key={href}>
            <Link
              href={href}
              className="text-forest data-[focus]:bg-canvas/45 flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-[14.5px] font-semibold no-underline transition-colors"
            >
              <Icon className="size-4 shrink-0" />
              {label}
            </Link>
          </MenuItem>
        ))}

        <div className="mx-2 my-1.5 border-t border-white/40" />

        <MenuItem>
          <button
            type="button"
            onClick={() => signOut({ redirectUrl: "/" })}
            className="text-danger data-[focus]:bg-danger/15 flex w-full cursor-pointer items-center gap-3 rounded-xl px-3.5 py-2.5 text-[14.5px] font-bold transition-colors"
          >
            <PowerIcon className="size-4 shrink-0" />
            Odjavi se
          </button>
        </MenuItem>
      </MenuItems>
    </Menu>
  );
}
