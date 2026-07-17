"use client";

import { MEMBERSHIP_ROLE_LABELS } from "@/lib/auth/identity";
import { useIdentity } from "@/lib/auth/clerk/use-identity";

/**
 * Debug/skeleton view of the current identity for the protected dashboards.
 * Shows the provider subject and the (still unassigned) internal role, making
 * it visible that role gating depends on the backend `GET /api/v1/me`.
 */
export function IdentityCard() {
  const { isLoaded, isSignedIn, identity } = useIdentity();

  if (!isLoaded) {
    return <p className="text-forest-lift text-sm">Učitavanje sesije…</p>;
  }

  if (!isSignedIn || !identity) {
    return <p className="text-forest-lift text-sm">Niste prijavljeni.</p>;
  }

  const roleLabels = [
    ...(identity.isSuperadmin ? ["Superadministrator (globalno)"] : []),
    ...identity.memberships.flatMap((membership) =>
      membership.roles.map((role) => MEMBERSHIP_ROLE_LABELS[role]),
    ),
  ];

  return (
    <dl className="divide-y divide-black/10 rounded-2xl border border-black/10 bg-white/50 p-6">
      <div className="flex flex-col gap-1 py-3 first:pt-0">
        <dt className="text-forest-lift text-xs tracking-wide uppercase">
          Korisnik (Clerk ID)
        </dt>
        <dd className="text-forest font-mono text-sm break-all">
          {identity.userId}
        </dd>
      </div>
      <div className="flex flex-col gap-1 py-3">
        <dt className="text-forest-lift text-xs tracking-wide uppercase">
          Email
        </dt>
        <dd className="text-forest text-sm">{identity.email ?? "—"}</dd>
      </div>
      <div className="flex flex-col gap-1 py-3 last:pb-0">
        <dt className="text-forest-lift text-xs tracking-wide uppercase">
          Role
        </dt>
        <dd className="text-forest text-sm">
          {roleLabels.length > 0
            ? roleLabels.join(", ")
            : "još nije dodeljena (čeka backend /me)"}
        </dd>
      </div>
    </dl>
  );
}
