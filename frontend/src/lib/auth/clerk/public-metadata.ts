import { z } from "zod";

import type { MembershipRole } from "@/lib/auth/identity";

/**
 * Interim role source (decision D-026): roles live in Clerk `publicMetadata`
 * until the backend identity slice (`GET /api/v1/me`, M2.1) replaces it. This
 * is a documented, temporary deviation from ARCHITECTURAL_RULES §10.3 —
 * metadata carries roles only, never domain data.
 *
 * Shapes written by `scripts/set-clerk-roles.mjs`:
 * - `{ "superadmin": true }` — platform team;
 * - `{ "roles": ["org_admin", "therapist"], "org": "psihointegritet" }` — staff.
 *
 * Shared by the server adapter and the client `useIdentity` hook, so both
 * sides of the app read metadata identically. No `server-only` import here.
 */

const DEFAULT_ORG = "psihointegritet";

const metadataSchema = z.object({
  superadmin: z.boolean().optional(),
  roles: z.array(z.enum(["client", "therapist", "org_admin"])).optional(),
  org: z.string().min(1).optional(),
});

export interface ParsedRoleMetadata {
  superadmin: boolean;
  roles: MembershipRole[];
  org: string;
}

/**
 * Parses untrusted `publicMetadata` (`Record<string, unknown>`) into the role
 * shape. Anything malformed degrades to "no roles" — never to elevated access.
 */
export function parseRoleMetadata(input: unknown): ParsedRoleMetadata {
  const parsed = metadataSchema.safeParse(input ?? {});
  if (!parsed.success) {
    return { superadmin: false, roles: [], org: DEFAULT_ORG };
  }
  return {
    superadmin: parsed.data.superadmin === true,
    roles: parsed.data.roles ?? [],
    org: parsed.data.org ?? DEFAULT_ORG,
  };
}
