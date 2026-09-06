"use client";

import { useUiLocale } from "@/i18n/use-ui-locale";

import { getFallbackContentForLocale, type FallbackContent } from "./registry";

/** Client-side twin of `getFallbackContent()`. */
export function useFallbackContent(): FallbackContent {
  return getFallbackContentForLocale(useUiLocale());
}
