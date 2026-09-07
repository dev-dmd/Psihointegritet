import Link from "next/link";

import { UserIcon } from "@heroicons/react/24/outline";

import { cn } from "@/helpers/cn";
import { SIGN_IN_PATH } from "@/lib/routes/auth-paths";

/**
 * The header's way in, on every host.
 *
 * These replace two client components that existed only to ask a provider
 * whether somebody was signed in. Nothing on a public page needs that question
 * answered — the site is anonymous end to end — and asking it put a client
 * boundary and a third-party script on all 26 public pages.
 *
 * Plain links instead. When the auth engine lands, a signed-in variant belongs
 * here beside them; the signed-out one does not change.
 *
 * The label is passed in rather than read here, because the header already
 * holds the translator and these are too small to own a namespace.
 */
export function SignInCircleLink({
  label,
  size = "md",
}: {
  label: string;
  size?: "md" | "sm";
}) {
  return (
    <Link
      href={SIGN_IN_PATH}
      aria-label={label}
      className={cn(
        "text-forest hover:bg-forest hover:text-canvas focus-visible:ring-forest/35 flex cursor-pointer items-center justify-center rounded-full border border-white/35 bg-gray-300/30 backdrop-blur-md transition-colors outline-none focus-visible:ring-2",
        size === "md" ? "size-11" : "size-[38px]",
      )}
    >
      <UserIcon className={size === "md" ? "size-[18px]" : "size-4"} />
    </Link>
  );
}

/**
 * The same door, as the pill inside the mobile drawer.
 *
 * No explicit close handler: following a link unmounts the drawer with the page
 * it belonged to, which is what the old `MobileDrawerCloseContext` call was
 * standing in for while the button opened a modal instead of navigating.
 */
export function SignInDrawerLink({ label }: { label: string }) {
  return (
    <Link
      href={SIGN_IN_PATH}
      className="border-coffee/20 text-coffee mt-3 flex w-full cursor-pointer items-center justify-center gap-2.5 rounded-full border-[1.5px] bg-transparent px-6 py-[13px] text-[15px] font-semibold"
    >
      <UserIcon className="size-4" />
      {label}
    </Link>
  );
}
