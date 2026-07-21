/**
 * Site-wide facts that can later move to a CMS/settings endpoint. Keep only
 * confirmed public details here; addresses, phone number and working hours are
 * intentionally absent until the team confirms them.
 */
export const siteSettings = {
  name: "Psihointegritet",
  description: "Digitalni centar za mentalno zdravlje",
  contactEmail: "info@psihointegritet.com",
  locations: ["Niš", "Leskovac"] as const,
  formatsLabel: "online i uživo",
} as const;

export const publicLocations = siteSettings.locations;
