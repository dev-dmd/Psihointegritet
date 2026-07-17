"use client";

import { Show, SignInButton } from "@clerk/nextjs";
import { UserIcon } from "@heroicons/react/24/outline";

import { cn } from "@/helpers/cn";
import { AuthAvatarMenu } from "@/lib/auth/clerk/auth-avatar-menu";

/**
 * Header auth control. Clerk v7 removed `<SignedIn>`/`<SignedOut>`; conditional
 * rendering by session state now goes through `<Show when="signed-in|signed-out">`,
 * which renders `null` while the session is still loading.
 *
 * Signed out → a glass circle opening Clerk's modal (registration lives behind
 * the same modal's "Sign up" link). Signed in → the custom avatar dropdown.
 * `size` matches the surrounding header: `md` (44px) over the hero, `sm` (38px)
 * inside the sticky pill.
 */
export function AuthMenu({ size = "md" }: { size?: "md" | "sm" }) {
  return (
    <>
      <Show when="signed-out">
        <SignInButton mode="modal">
          <button
            type="button"
            aria-label="Uloguj se"
            className={cn(
              "text-forest hover:bg-forest hover:text-canvas focus-visible:ring-forest/35 flex cursor-pointer items-center justify-center rounded-full border border-white/35 bg-gray-400/30 backdrop-blur-md transition-colors outline-none focus-visible:ring-2",
              size === "md" ? "size-11" : "size-[38px]",
            )}
          >
            <UserIcon className={size === "md" ? "size-[18px]" : "size-4"} />
          </button>
        </SignInButton>
      </Show>

      <Show when="signed-in">
        <AuthAvatarMenu size={size} />
      </Show>
    </>
  );
}
