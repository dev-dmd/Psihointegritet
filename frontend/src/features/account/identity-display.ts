import type { Identity } from "@/lib/auth/identity";

/**
 * How the panel addresses the signed-in client.
 *
 * `Identity.displayName` is null for an account that signed up with an email
 * and never filled in a profile, which is most of them at this stage — so both
 * helpers are written around that being normal rather than exceptional.
 */

/**
 * First name for the greeting, or `null` when there is no name to use.
 *
 * Deliberately does not fall back to the email: „Dobro jutro,
 * marija.stamenkovic." is worse than „Dobro jutro." — an address the person
 * would never use to introduce themselves reads as a form letter.
 */
export function firstNameOf(identity: Identity): string | null {
  const first = identity.displayName?.trim().split(/\s+/)[0];
  return first === undefined || first === "" ? null : first;
}

/** Heading on the profile screen: the name, else the email, else nothing. */
export function profileNameOf(identity: Identity): string | null {
  const name = identity.displayName?.trim();
  if (name !== undefined && name !== "") return name;
  const email = identity.email?.trim();
  return email === undefined || email === "" ? null : email;
}
