"use client";

import type { Route } from "next";
import Link from "next/link";
import { useState } from "react";

import { useSignOut } from "@/lib/auth/session/use-sign-out";

/**
 * The way off a page that was otherwise a dead end.
 *
 * `/pristup-odbijen` is reached with a **valid session** — the sign-in worked,
 * the account simply has no membership yet. That makes the ordinary escape
 * routes wrong: the sign-in form would bounce straight back here, because the
 * proxy sends a signed-in visitor away from it, and the header on this page is
 * deliberately absent. Without a sign-out the only exit is clearing cookies by
 * hand.
 *
 * Sign-out lands on `/prijava` rather than the home page, because somebody
 * ending a session *here* is doing it in order to try another account.
 */
export function AccessDeniedActions({
  signInPath,
  copy,
}: {
  signInPath: string;
  copy: { signOutLabel: string; workingLabel: string; homeLabel: string };
}) {
  const signOut = useSignOut(signInPath as Route);
  const [pending, setPending] = useState(false);

  return (
    <div className="mt-8 flex flex-wrap items-center gap-4">
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          setPending(true);
          void signOut();
        }}
        className="bg-coffee text-canvas hover:bg-coffee/90 cursor-pointer rounded-full px-6 py-3 text-[15px] font-semibold transition-colors disabled:cursor-progress disabled:opacity-60"
      >
        {pending ? copy.workingLabel : copy.signOutLabel}
      </button>
      <Link
        href="/"
        className="text-coffee/60 hover:text-coffee text-[14px] underline transition-colors"
      >
        {copy.homeLabel}
      </Link>
    </div>
  );
}
