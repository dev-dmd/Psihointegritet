import "server-only";

import { cache } from "react";

import type { UiLocale } from "@/i18n/locales";
import type { Identity } from "@/lib/auth/identity";
import { requireStaff } from "@/lib/auth/guards";
import { getDeploymentOrganization } from "@/lib/tenant/org-context";
import { assertWorkspaceOrganization } from "@/lib/tenant/workspace-locale";

export interface WorkspaceBootstrap {
  identity: Identity;
  organization: {
    slug: string;
    uiLocale: UiLocale;
    defaultContentLocale: UiLocale;
  };
}

async function loadWorkspaceBootstrap(): Promise<WorkspaceBootstrap> {
  const [identity, organization] = await Promise.all([
    requireStaff(),
    getDeploymentOrganization("live"),
  ]);
  assertWorkspaceOrganization(identity, organization);

  return {
    identity,
    organization: {
      slug: organization.slug,
      uiLocale: organization.uiLocale,
      defaultContentLocale: organization.defaultContentLocale,
    },
  };
}

/** One request-scoped organization/identity bootstrap for the workspace tree. */
export const getWorkspaceBootstrap = cache(loadWorkspaceBootstrap);
