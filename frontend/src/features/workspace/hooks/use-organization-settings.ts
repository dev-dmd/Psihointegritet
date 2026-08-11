"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

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

  return useMutation({
    mutationFn: (input: {
      uiLocale: UiLocale;
      defaultContentLocale: UiLocale;
    }) => updateOrganizationLocales(input),
    onSuccess: (settings) => {
      queryClient.setQueryData(ORGANIZATION_SETTINGS_QUERY_KEY, settings);
      callbacks.onSaved(settings);
    },
    onError: callbacks.onFailed,
  });
}
