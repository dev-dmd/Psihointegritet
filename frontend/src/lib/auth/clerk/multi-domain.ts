import {
  TENANT_DOMAINS,
  isPlatformHost,
  normalizeHost,
  tenantForHost,
} from "@/lib/tenant/domain-registry";
import { SIGN_IN_PATH, SIGN_UP_PATH } from "@/lib/routes/auth-paths";

/**
 * Clerk configuration for a project that answers on many hostnames.
 *
 * Clerk's production instance has exactly one **primary** domain, where the
 * central session lives and where sign-in physically happens. Every other
 * hostname is a **satellite**: it carries the app, hands sign-in to the primary
 * domain, and receives the person back afterwards.
 *
 * # The consequence, stated rather than hidden
 *
 * A client on `sanjaneuer.com` who signs in will visit
 * `p-digital-center.com/prijava` and come back. That is Clerk's contract for a
 * single instance across domains, and it means the earlier goal — a tenant's
 * client never sees the platform domain — is not compatible with this model.
 * The mitigation is presentation, not URL trickery: the sign-in screen can be
 * branded for the tenant being returned to. Making the URL never leave the
 * tenant host is a different auth architecture (an instance per tenant, or a
 * self-hosted flow), and is deliberately not attempted here.
 *
 * # Why this is configuration and not a constant
 *
 * The primary domain is `psihointegritet.com` today, because that is where the
 * Clerk production instance was created. Naming the target in code would mean
 * the Dashboard change and a deploy have to land in the same instant, and
 * whichever arrived first would break sign-in for everyone.
 *
 * So `CLERK_PRIMARY_HOST` decides. **Unset — today — means no satellite
 * configuration at all**, exactly the behaviour that has been running: one
 * instance, one domain, nothing declared. Setting it after the Dashboard's
 * "Change domain" makes every other registered host a satellite in one env
 * change, which is what makes the cutover a single controlled operation.
 */
export interface ClerkDomainConfig {
  isSatellite: boolean;
  signInUrl: string;
  signUpUrl: string;
  allowedRedirectOrigins: string[];
}

/** The configured Clerk primary host, or `""` while the cutover has not happened. */
export function clerkPrimaryHost(): string {
  return normalizeHost(process.env.CLERK_PRIMARY_HOST);
}

/**
 * Every origin Clerk may return a person to after sign-in.
 *
 * Built from the registry, so it is the same list that decides which hosts this
 * project serves at all — a domain cannot become a redirect target without
 * first being a tenant's or the platform's. No wildcards: `https://*.vercel.app`
 * would make every preview deployment on the account a valid place to land a
 * session on.
 */
export function allowedRedirectOrigins(): string[] {
  const origins = new Set<string>();
  for (const tenant of TENANT_DOMAINS) {
    for (const host of tenant.domains) origins.add(`https://${host}`);
  }
  const platform = normalizeHost(process.env.PLATFORM_HOST);
  if (platform !== "") origins.add(`https://${platform}`);
  const primary = clerkPrimaryHost();
  if (primary !== "") origins.add(`https://${primary}`);
  return [...origins].sort();
}

/**
 * How Clerk should behave for the host this request arrived on.
 *
 * The host is taken from the trusted registry rather than trusted as a string:
 * an unregistered hostname never reaches here, because the proxy refuses it
 * before any page renders.
 */
export function clerkDomainConfig(): ClerkDomainConfig {
  const primary = clerkPrimaryHost();

  const base = {
    allowedRedirectOrigins: allowedRedirectOrigins(),
  };

  // Before the cutover: one instance, one domain, no satellites — exactly the
  // configuration that has been running. Setting `CLERK_PRIMARY_HOST` is what
  // turns the whole model on, in one env change.
  if (primary === "") {
    return {
      isSatellite: false,
      signInUrl: SIGN_IN_PATH,
      signUpUrl: SIGN_UP_PATH,
      ...base,
    };
  }

  // After it, sign-in physically happens on the primary domain. The URL is
  // absolute so a satellite hands the flow over rather than trying to run it.
  //
  // `isSatellite` is resolved per URL by `clerkSatelliteDomainFor` on the
  // client; here it only has to be true for every host that is not the
  // primary, and the primary's own pages ignore it because their domain
  // resolves to the primary itself.
  return {
    isSatellite: true,
    signInUrl: `https://${primary}${SIGN_IN_PATH}`,
    signUpUrl: `https://${primary}${SIGN_UP_PATH}`,
    ...base,
  };
}

/**
 * Which domain Clerk should treat this page as belonging to.
 *
 * Shaped for Clerk's `(url) => …` option and **not yet wired**: a function
 * cannot be passed from the root layout's Server Component into `ClerkProvider`,
 * and resolving the host there instead would call `headers()` in the render
 * path and take every prerendered page down to SSR — measured at 30 static
 * routes becoming 3.
 *
 * It is written and tested now so the Clerk cutover changes configuration
 * rather than logic. See `auth-provider.tsx` for why the wiring waits.
 *
 * A host the registry does not know falls back to the primary, so an
 * unrecognised name can never be declared to Clerk as a satellite domain.
 */
export function clerkSatelliteDomainFor(url: URL): string {
  const primary = clerkPrimaryHost();
  const current = normalizeHost(url.host);
  if (primary === "") return current;
  if (current === primary) return primary;

  const known = tenantForHost(current) !== undefined || isPlatformHost(current);
  return known ? current : primary;
}
