import type { Metadata } from "next";

import { ScreenProfil } from "@/features/account/components/screen-profil";
import { profileNameOf } from "@/features/account/identity-display";
import { requireClient } from "@/lib/auth/guards";
import { getInitials } from "@/lib/auth/clerk/initials";

export const metadata: Metadata = { title: "Profil" };

/**
 * KP 04 „Profil" — identity, notification preferences, documents, sign out.
 *
 * Name, email and monogram are resolved server-side from `Identity` so the
 * screen never renders a nameless frame first; the profile photo is the one
 * thing read on the client, because only the Clerk session knows whether the
 * user uploaded one.
 */
export default async function ClientProfilePage() {
  const identity = await requireClient();
  const [firstName, lastName] = (identity.displayName ?? "").split(" ");

  return (
    <ScreenProfil
      displayName={profileNameOf(identity)}
      email={identity.email}
      initials={getInitials(firstName, lastName, identity.email)}
    />
  );
}
