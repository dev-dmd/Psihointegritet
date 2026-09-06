import type { MembershipRole } from "@/lib/auth/identity";
import { parseJsonResponse } from "@/lib/api/request-json";

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
  return parseJsonResponse<TenantUser[]>(response);
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
  return parseJsonResponse<TenantUser>(response);
}
