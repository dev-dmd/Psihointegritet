"use client";

import { useUser } from "@clerk/nextjs";
import { toast } from "sonner";

import { BackToSiteButton } from "@/components/shared/back-to-site-button";
import { LogoutAvatarMenu } from "@/components/shared/logout-avatar-menu";
import { getInitials } from "@/lib/auth/clerk/initials";

/**
 * Minimal sticky header for the client account area (`/nalog`). The area has
 * no sidebar (unlike Control Center / Superadmin), so this is its only
 * chrome for now — logo, a notification placeholder, and the avatar
 * sign-out dropdown. Full Klijent Panel navigation (Početna/Termini/Programi
 * tabs) lands with the real dashboard build-out.
 */
export function AccountTopbar() {
  const { user } = useUser();

  const email = user?.primaryEmailAddress?.emailAddress;
  const initials = getInitials(user?.firstName, user?.lastName, email);

  return (
    <header className="bg-panel-canvas/88 border-coffee/8 sticky top-0 z-40 flex items-center gap-3.5 border-b px-4 py-2.5 backdrop-blur-md md:px-8 md:py-3">
      <span className="flex items-baseline">
        <span className="text-forest font-serif text-xl font-medium">
          Psihointegritet
        </span>
        <span
          aria-hidden
          className="bg-warm ml-1 h-[5px] w-[5px] rounded-full"
        />
      </span>
      <span className="flex-1" />
      <BackToSiteButton className="border-coffee/12 text-coffee hover:border-sage bg-surface" />
      <button
        type="button"
        title="Obaveštenja"
        aria-label="Obaveštenja"
        onClick={() => toast("Nema novih obaveštenja.")}
        className="border-coffee/12 text-coffee hover:border-sage bg-surface relative flex h-10 w-10 items-center justify-center rounded-full border transition-colors"
      >
        <svg
          aria-hidden
          width="17"
          height="17"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.7 21a2 2 0 0 1-3.4 0" />
        </svg>
        <span
          aria-hidden
          className="bg-warm border-surface absolute top-2 right-[9px] h-2 w-2 rounded-full border-[1.5px]"
        />
      </button>
      <LogoutAvatarMenu
        initials={initials}
        label="Korisnički meni"
        triggerClassName="border-meadow/55 bg-meadow/20 text-forest hover:border-sage focus-visible:ring-forest/35 flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border text-[13px] font-semibold outline-none transition-colors focus-visible:ring-2"
      />
    </header>
  );
}
