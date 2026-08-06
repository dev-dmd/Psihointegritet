/**
 * Public Kompas activation (D-059).
 *
 * Kompas belongs to the R3 Content scope but activates independently per
 * environment: the public surface stays off until that environment has the
 * editorial data, the admin acceptance run and a green public E2E behind it.
 *
 * The flag defaults to **off** on purpose. An environment nobody configured
 * cannot expose a Kompas whose backend may not even serve `modules/compass`,
 * and a disabled environment never prerenders the taxonomy routes, so a
 * backend outage cannot fail its build.
 *
 * Not part of `serverEnv`: this is an optional switch, and a missing value is a
 * valid state (off), not an invalid environment.
 */
export function isCompassPublicEnabled(): boolean {
  return process.env.NEXT_PUBLIC_COMPASS_ENABLED === "true";
}
