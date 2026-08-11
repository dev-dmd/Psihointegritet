"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

import type { UiLocale } from "@/i18n/locales";

import {
  fetchOrganizationSettings,
  updateOrganizationLocales,
  type OrganizationSettings,
} from "../organization-api";

export const ORGANIZATION_SETTINGS_QUERY_KEY = [
  "organization",
  "settings",
] as const;

export function useOrganizationSettingsQuery() {
  return useQuery({
    queryKey: ORGANIZATION_SETTINGS_QUERY_KEY,
    queryFn: fetchOrganizationSettings,
  });
}

/**
 * Changing the organization's languages.
 *
 * The panel is request-time rendered, so `ui_locale` takes effect on the next
 * navigation — but `default_content_locale` moves the public site, its canonical
 * URLs and its sitemap, which is a release operation rather than a toggle
 * (D-077). The screen says so; this hook only refreshes the cache it owns and
 * deliberately does not try to make the change look instant.
 */
export function useOrganizationLocalesMutation(callbacks: {
  onSaved: (settings: OrganizationSettings) => void;
  onFailed: (error: unknown) => void;
}) {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: (input: {
      uiLocale: UiLocale;
      defaultContentLocale: UiLocale;
    }) => updateOrganizationLocales(input),
    onSuccess: (settings) => {
      queryClient.setQueryData(ORGANIZATION_SETTINGS_QUERY_KEY, settings);
      // The language lives in the *server* tree — nav labels, the html lang
      // attribute and every href built by `localizedPath`. Updating the query
      // cache alone leaves all of that rendered in the previous language until
      // the user reloads by hand, which is exactly what it did.
      router.refresh();
      callbacks.onSaved(settings);
    },
    onError: callbacks.onFailed,
  });
}
