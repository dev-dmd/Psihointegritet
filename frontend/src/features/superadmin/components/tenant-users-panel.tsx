"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

import type { MembershipRole } from "@/lib/auth/identity";
import {
  fetchTenantUsers,
  replaceTenantUserRoles,
  type TenantUser,
} from "@/features/superadmin/tenant-users-api";

const MANAGEABLE_ROLES: MembershipRole[] = ["org_admin", "therapist"];

export function TenantUsersPanel({ tenantSlug }: { tenantSlug: string }) {
  const t = useTranslations("superadmin.tenantUsers");
  const [users, setUsers] = useState<TenantUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void fetchTenantUsers(tenantSlug)
      .then(setUsers)
      .catch(() => setError(t("loadError")))
      .finally(() => setLoading(false));
  }, [t, tenantSlug]);

  async function toggleRole(user: TenantUser, role: MembershipRole) {
    const roles = user.roles.includes(role)
      ? user.roles.filter((candidate) => candidate !== role)
      : [...user.roles, role];
    setSavingId(user.id);
    setError(null);
    try {
      const updated = await replaceTenantUserRoles(tenantSlug, user.id, roles);
      setUsers((current) =>
        current.map((candidate) =>
          candidate.id === updated.id ? updated : candidate,
        ),
      );
    } catch {
      setError(t("saveError"));
    } finally {
      setSavingId(null);
    }
  }

  if (loading) return <p className="text-ink-55 text-sm">{t("loading")}</p>;
  if (error && users.length === 0)
    return <p className="text-danger text-sm">{error}</p>;

  return (
    <div className="rounded-panel border-line bg-surface border px-5 py-3">
      <p className="text-ink-55 mb-3 text-xs">{t("description")}</p>
      {error ? <p className="text-danger mb-2 text-xs">{error}</p> : null}
      {users.map((user) => (
        <div
          key={user.id}
          className="border-line flex flex-wrap items-center justify-between gap-3 border-t py-3 first:border-t-0"
        >
          <div>
            <p className="text-coffee text-sm font-semibold">
              {user.displayName ?? user.email ?? user.externalAuthId}
            </p>
            <p className="text-ink-55 text-xs">
              {user.email ?? user.externalAuthId}
            </p>
          </div>
          <div className="flex gap-2">
            {MANAGEABLE_ROLES.map((role) => (
              <button
                key={role}
                type="button"
                disabled={savingId === user.id || !user.isActive}
                onClick={() => void toggleRole(user, role)}
                className={`rounded-full border px-3 py-1 text-xs font-semibold ${user.roles.includes(role) ? "bg-forest text-white" : "border-line text-coffee"}`}
              >
                {role === "org_admin" ? t("adminRole") : t("therapistRole")}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
