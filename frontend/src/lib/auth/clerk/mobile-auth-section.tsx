"use client";

import Link from "next/link";
import { useContext } from "react";

import { SignInButton, SignOutButton, useUser } from "@clerk/nextjs";
import { UserIcon } from "@heroicons/react/24/outline";

import { MobileDrawerCloseContext } from "@/components/sections/mobile-menu-context";
import { getInitials } from "@/lib/auth/clerk/initials";
import { ACCOUNT_URL } from "@/lib/auth/routes";

/**
 * Auth section rendered inside the mobile navigation drawer. Closing the drawer
 * on tap goes through `MobileDrawerCloseContext` (provided by `MobileMenu`) —
 * the drawer renders this element as-is, without cloning, so no prop crosses
 * the server/client boundary.
 *
 * Session state is branched with `useUser().isSignedIn` rather than Clerk's
 * `<Show>` component: this section renders lazily inside a portal, and `<Show>`
 * — a server-components module export — resolves to `undefined` when
 * instantiated purely on the client after hydration. The hook is client-safe.
 */
export function MobileAuthSection() {
  const closeDrawer = useContext(MobileDrawerCloseContext);
  const { isLoaded, isSignedIn, user } = useUser();

  if (!isLoaded) {
    return null;
  }

  if (!isSignedIn) {
    return (
      <SignInButton mode="modal">
        <button
          type="button"
          onClick={() => closeDrawer()}
          className="border-coffee/20 text-coffee mt-3 flex w-full cursor-pointer items-center justify-center gap-2.5 rounded-full border-[1.5px] bg-transparent px-6 py-[13px] text-[15px] font-semibold"
        >
          <UserIcon className="size-4" />
          Uloguj se
        </button>
      </SignInButton>
    );
  }

  const email = user.primaryEmailAddress?.emailAddress;
  const initials = getInitials(user.firstName, user.lastName, email);
  const fullName = user.fullName ?? email ?? "Vaš nalog";

  return (
    <div className="mt-3 flex items-center gap-3">
      <Link
        href={ACCOUNT_URL}
        onClick={() => closeDrawer()}
        className="flex min-w-0 flex-1 items-center gap-3 no-underline"
      >
        <span className="bg-meadow text-forest flex size-10 shrink-0 items-center justify-center rounded-full text-[14px] font-semibold">
          {initials}
        </span>
        <span className="flex min-w-0 flex-col">
          <span className="text-coffee truncate text-[15px] font-semibold">
            {fullName}
          </span>
          <span className="text-coffee/55 truncate text-[12.5px]">
            Moj panel · Moji termini
          </span>
        </span>
      </Link>
      <SignOutButton redirectUrl="/">
        <button
          type="button"
          onClick={() => closeDrawer()}
          className="text-danger shrink-0 cursor-pointer text-[14px] font-bold"
        >
          Odjavi se
        </button>
      </SignOutButton>
    </div>
  );
}
