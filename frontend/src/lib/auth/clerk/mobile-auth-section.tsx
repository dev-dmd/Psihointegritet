"use client";

import Link from "next/link";

import { Show, SignInButton, SignOutButton, useUser } from "@clerk/nextjs";
import { UserIcon } from "@heroicons/react/24/outline";

import { getInitials } from "@/lib/auth/clerk/initials";
import { ACCOUNT_URL } from "@/lib/auth/routes";

/**
 * Auth section rendered inside the mobile navigation drawer. `onNavigate` is
 * injected by `MobileMenu` (which owns the drawer's open state) so tapping any
 * control also closes the drawer; it stays optional because the component is
 * authored provider-side and wired up on the client.
 */
export function MobileAuthSection({ onNavigate }: { onNavigate?: () => void }) {
  const { user } = useUser();
  const email = user?.primaryEmailAddress?.emailAddress;
  const initials = getInitials(user?.firstName, user?.lastName, email);
  const fullName = user?.fullName ?? email ?? "Vaš nalog";

  return (
    <>
      <Show when="signed-out">
        <SignInButton mode="modal">
          <button
            type="button"
            onClick={onNavigate}
            className="border-coffee/20 text-coffee mt-3 flex w-full cursor-pointer items-center justify-center gap-2.5 rounded-full border-[1.5px] bg-transparent px-6 py-[13px] text-[15px] font-semibold"
          >
            <UserIcon className="size-4" />
            Uloguj se
          </button>
        </SignInButton>
      </Show>

      <Show when="signed-in">
        <div className="mt-3 flex items-center gap-3">
          <Link
            href={ACCOUNT_URL}
            onClick={() => onNavigate?.()}
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
              onClick={onNavigate}
              className="text-danger shrink-0 cursor-pointer text-[14px] font-bold"
            >
              Odjavi se
            </button>
          </SignOutButton>
        </div>
      </Show>
    </>
  );
}
