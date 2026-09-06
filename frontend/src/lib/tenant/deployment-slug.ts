/**
 * Which tenant this deployment serves — the C2(a) deployment binding.
 *
 * This is **not** a tenant onboarding mechanism. It answers one question, at
 * one moment: which organization is this running copy of the application bound
 * to. Creating a tenant is `provision_organization`; binding a deployment to
 * one is this value.
 *
 * **Why the founding-tenant fallback is now conditional.** Four call sites read
 * `DEFAULT_ORGANIZATION_SLUG` and each defaulted to `"psihointegritet"`, on the
 * reasoning that absence had one correct answer. That reasoning held while one
 * tenant existed. It stopped holding the day a second deployment went up:
 * absence there does not mean "the founding tenant", it means somebody forgot,
 * and the fallback turns a missing variable into another tenant's site served
 * under this one's domain — silently, with no error anywhere.
 *
 * So the fallback survives only where it is a convenience and cannot mislead:
 * a developer's machine. A deployment that calls itself `staging` or
 * `production` must say who it is.
 */

/** The first tenant, kept as a development convenience and nothing more. */
export const FOUNDING_TENANT_SLUG = "psihointegritet";

/** Deployment environments where an implicit tenant is refused. */
const EXPLICIT_TENANT_REQUIRED: ReadonlySet<string> = new Set([
  "staging",
  "production",
]);

export class MissingDeploymentTenantError extends Error {
  constructor(readonly deploymentEnv: string) {
    super(
      `DEPLOYMENT_ENV is "${deploymentEnv}" but DEFAULT_ORGANIZATION_SLUG is not set. ` +
        `A deployed environment must name the organization it serves; falling back to ` +
        `"${FOUNDING_TENANT_SLUG}" would serve one tenant's content under another's domain. ` +
        `Set DEFAULT_ORGANIZATION_SLUG for this deployment.`,
    );
    this.name = "MissingDeploymentTenantError";
  }
}

/**
 * The bound organization, or a thrown error rather than someone else's tenant.
 *
 * Pure so the same rule can be applied from the env validator, the content
 * registry, the tenant registry and `next.config.ts` without four copies of it.
 */
export function resolveDeploymentSlug(
  slug: string | undefined | null,
  deploymentEnv: string | undefined | null,
): string {
  const provided = slug?.trim() ?? "";
  if (provided !== "") return provided;

  if (deploymentEnv != null && EXPLICIT_TENANT_REQUIRED.has(deploymentEnv)) {
    throw new MissingDeploymentTenantError(deploymentEnv);
  }
  return FOUNDING_TENANT_SLUG;
}

/**
 * The same answer from the ambient environment.
 *
 * In the browser only `NEXT_PUBLIC_*` and whatever `next.config.ts` inlines
 * exist, so `DEPLOYMENT_ENV` reads as `undefined` there and this cannot throw.
 * That is safe rather than a hole: `next.config.ts` applies the same rule at
 * build time, so a deployed bundle missing the slug never gets built.
 */
export function deploymentSlugFromEnv(): string {
  return resolveDeploymentSlug(
    process.env.DEFAULT_ORGANIZATION_SLUG,
    process.env.DEPLOYMENT_ENV,
  );
}
