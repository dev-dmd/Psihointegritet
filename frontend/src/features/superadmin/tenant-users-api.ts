import type { MembershipRole } from "@/lib/auth/identity";

export type TenantUser = {
  id: string;
  externalAuthId: string;
  email: string | null;
  displayName: string | null;
  isActive: boolean;
  roles: MembershipRole[];
};

export async function fetchTenantUsers(
  tenantSlug: string,
): Promise<TenantUser[]> {
  const response = await fetch(
    `/api/superadmin/tenants/${encodeURIComponent(tenantSlug)}/users`,
  );
  if (!response.ok)
    throw new Error(`Tenant users request failed: ${response.status}`);
  return (await response.json()) as TenantUser[];
}

export async function replaceTenantUserRoles(
  tenantSlug: string,
  userId: string,
  roles: MembershipRole[],
): Promise<TenantUser> {
  const response = await fetch(
    `/api/superadmin/tenants/${encodeURIComponent(tenantSlug)}/users/${encodeURIComponent(userId)}/roles`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roles }),
    },
  );
  if (!response.ok)
    throw new Error(`Tenant roles request failed: ${response.status}`);
  return (await response.json()) as TenantUser;
}
