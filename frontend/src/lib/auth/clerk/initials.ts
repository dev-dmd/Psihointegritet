/**
 * Two-letter monogram for an avatar: first name + last name initial, falling
 * back to the first two characters of the email local part. Shared by the
 * header avatar dropdown and the mobile drawer so both stay in sync.
 */
export function getInitials(
  firstName?: string | null,
  lastName?: string | null,
  email?: string | null,
): string {
  const first = firstName?.trim()?.[0];
  const last = lastName?.trim()?.[0];

  if (first && last) {
    return `${first}${last}`.toUpperCase();
  }
  if (first) {
    return first.toUpperCase();
  }

  const localPart = email?.split("@")[0]?.replace(/[^a-zA-Z0-9]/g, "") ?? "";
  return localPart.slice(0, 2).toUpperCase() || "?";
}
