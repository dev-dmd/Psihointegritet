import "server-only";

import { z } from "zod";

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
   * Which organization this deployment serves (D-077). Its `ui_locale` decides
   * the platform UI language, so a wrong value here is a wrong-language site.
   *
   * Defaults to the founding tenant rather than being required, matching the
   * two places that already default the same way — `DEFAULT_ORG` in
   * `lib/auth/clerk/public-metadata.ts` and `settings.default_organization_slug`
   * on the backend. Making it required would break every existing deployment
   * on the next push for no safety gain: the dangerous case is not "absent"
   * (which has one correct answer today) but "present and wrong", and that is
   * caught by `resolveRequestOrganization`, which throws on an unregistered
   * slug instead of quietly serving English.
   */
  DEFAULT_ORGANIZATION_SLUG: z.string().min(1).default("psihointegritet"),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

function loadServerEnv(): ServerEnv {
  const parsed = serverEnvSchema.safeParse({
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    DEPLOYMENT_ENV: process.env.DEPLOYMENT_ENV,
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY:
      process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
    CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY,
    DEFAULT_ORGANIZATION_SLUG: process.env.DEFAULT_ORGANIZATION_SLUG,
  });

  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("; ");
    throw new Error(`Invalid server environment: ${issues}`);
  }

  return parsed.data;
}

export const serverEnv: ServerEnv = loadServerEnv();
