"use client";

import { startTransition } from "react";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { usePathname, useRouter } from "next/navigation";

import type { UiLocale } from "@/i18n/locales";
import { localizedPath } from "@/lib/routes/localized-path";
import { matchPlatformPath } from "@/lib/routes/match";

import {
  updateOrganizationLocales,
  type OrganizationSettings,
} from "../organization-api";

export const ORGANIZATION_SETTINGS_QUERY_KEY = [
  "organization",
  "settings",
] as const;

/**
 * Changing the organization's render language.
 *
 * The panel is request-time rendered, while public renders use the tagged read
 * of the same `ui_locale`. `default_content_locale` is sent unchanged because
 * it is only a creation default for new CMS entries (D-077 A5).
 */
export function useOrganizationLocalesMutation(callbacks: {
  onSaved: (settings: OrganizationSettings) => void;
  onFailed: (error: unknown) => void;
}) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const pathname = usePathname();

  return useMutation({
    mutationFn: (input: {
      uiLocale: UiLocale;
      defaultContentLocale: UiLocale;
    }) => updateOrganizationLocales(input),
    onSuccess: (settings) => {
      queryClient.setQueryData(ORGANIZATION_SETTINGS_QUERY_KEY, settings);
      callbacks.onSaved(settings);
      // The language lives in the *server* tree — nav labels, the html lang
      // attribute and every href built by `localizedPath`. Updating the query
      // cache alone leaves all of that rendered in the previous language until
      // the user reloads by hand, which is exactly what it did.
      // Native history changes only the address and synchronizes Next's
      // pathname. One refresh then asks the server for the new layout locale
      // and messages. Two router operations race; one replace without refresh
      // preserves the shared layout and leaves its provider in the old locale.
      const here = matchPlatformPath(pathname);
      const target =
        here === null
          ? null
          : localizedPath(here.routeId, {
              locale: settings.uiLocale,
              params: here.params,
            } as never);

      if (target !== null && target !== pathname) {
        const suffix = `${window.location.search}${window.location.hash}`;
        window.history.replaceState(
          window.history.state,
          "",
          `${target}${suffix}`,
        );
      }

      startTransition(() => {
        router.refresh();
      });
    },
    onError: callbacks.onFailed,
  });
}
