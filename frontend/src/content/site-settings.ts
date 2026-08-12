/**
 * Site-wide facts that can later move to a CMS/settings endpoint. Keep only
 * confirmed public details here; addresses, phone number and working hours are
 * intentionally absent until the team confirms them.
 *
 * Locations follow D-076: Chicago (IL), Milwaukee (WI) and Madison (WI). They
 * must stay in step with `city` in `content/therapists.ts` — the booking
 * location picker and the guided-selection in-person filter both compare a
 * visitor's answer against the therapist's city, so a value that appears here
 * but nowhere in the team silently returns no therapists.
 */
export const siteSettings = {
  name: "Psihointegritet",
  description: "Digitalni centar za mentalno zdravlje",
  contactEmail: "info@psihointegritet.com",
  locations: [
    { city: "Chicago", region: "Illinois", regionCode: "IL" },
    { city: "Milwaukee", region: "Wisconsin", regionCode: "WI" },
    { city: "Madison", region: "Wisconsin", regionCode: "WI" },
  ] as const,
  country: "USA",
  formatsLabel: "online i uživo",
} as const;

export const publicLocations = siteSettings.locations;

/** „Chicago, IL · Milwaukee, WI · Madison, WI" — for tight surfaces. */
export const locationsShortLabel = publicLocations
  .map((location) => `${location.city}, ${location.regionCode}`)
  .join(" · ");

/** „Chicagu, Milwaukeeju i Madisonu" is per-therapist; this is the plain list. */
export const locationCities = publicLocations.map((location) => location.city);
