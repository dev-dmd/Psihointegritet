import "server-only";

import { z } from "zod";

import { resolveDeploymentSlug } from "@/lib/tenant/deployment-slug";
import { resolvePlatformHost } from "@/lib/tenant/domain-registry";

/**
 * Server-side environment validation. Imported from the root layout so an
 * invalid environment fails fast at build/startup instead of at request time.
 * The Clerk keys are required now that the auth milestone (Milestone 1) is
 * active: the publishable key is needed by ClerkProvider and the secret key by
 * `clerkMiddleware` in `proxy.ts`.
 */
const serverEnvSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.url(),
  NEXT_PUBLIC_API_URL: z.url(),
  DEPLOYMENT_ENV: z
    .enum(["development", "preview", "staging", "production"])
    .default("development"),
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z
    .string()
    .min(1, "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY is required"),
  CLERK_SECRET_KEY: z.string().min(1, "CLERK_SECRET_KEY is required"),
  /**
   * Which organization this deployment serves (D-077) — the C2(a) deployment
   * binding, not a tenant onboarding step.
   *
   * Optional in the schema and resolved below, because whether absence is
   * acceptable depends on `DEPLOYMENT_ENV`. This field used to default to the
   * founding tenant unconditionally, on the reasoning that "absent" had one
   * correct answer while "present and wrong" was the dangerous case. Sanja's
   * onboarding disproved it: on a second deployment, absent means somebody
   * forgot, and the default then serves one tenant's site under another's
   * domain with nothing raised anywhere.
   */
  DEFAULT_ORGANIZATION_SLUG: z.string().min(1).optional(),
  /**
   * Which host serves the owners' workspace and the operator console (B2).
   *
   * Not a tenant domain and not derivable from one: tenants are looked up by
   * host in `lib/tenant/domain-registry.ts`, while the platform is the one host
   * where an owner's organization comes from their membership instead. Today it
   * is the founding tenant's domain, which is therefore both; that is why it is
   * configuration rather than a constant.
   *
   * Optional here and resolved below, on the same rule as the slug above.
   */
  PLATFORM_HOST: z.string().min(1).optional(),
});

export type ServerEnv = z.infer<typeof serverEnvSchema> & {
  /** Always resolved by `loadServerEnv`; never optional to callers. */
  DEFAULT_ORGANIZATION_SLUG: string;
  /** Empty only in local development, where every dev host is the platform. */
  PLATFORM_HOST: string;
};

function loadServerEnv(): ServerEnv {
  const parsed = serverEnvSchema.safeParse({
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    DEPLOYMENT_ENV: process.env.DEPLOYMENT_ENV,
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY:
      process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
    CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY,
    DEFAULT_ORGANIZATION_SLUG: process.env.DEFAULT_ORGANIZATION_SLUG,
    PLATFORM_HOST: process.env.PLATFORM_HOST,
  });

  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("; ");
    throw new Error(`Invalid server environment: ${issues}`);
  }

  // Applied after parsing rather than inside the schema: the rule needs
  // `DEPLOYMENT_ENV` in its already-defaulted form, and a Zod refinement would
  // report it as a validation issue rather than the configuration error it is.
  return {
    ...parsed.data,
    DEFAULT_ORGANIZATION_SLUG: resolveDeploymentSlug(
      parsed.data.DEFAULT_ORGANIZATION_SLUG,
      parsed.data.DEPLOYMENT_ENV,
    ),
    PLATFORM_HOST: resolvePlatformHost(
      parsed.data.PLATFORM_HOST,
      parsed.data.DEPLOYMENT_ENV,
    ),
  };
}

export const serverEnv: ServerEnv = loadServerEnv();
