"use client";

import { useMemo } from "react";

import { useUiLocale } from "@/i18n/use-ui-locale";

import {
  presentUserSafeError,
  userSafeErrorText,
  type ErrorOperation,
  type ErrorSurface,
} from "./user-safe-error";

export function useUserSafeError() {
  const locale = useUiLocale();
  return useMemo(
    () => ({
      present: (
        error: unknown,
        surface: ErrorSurface,
        operation: ErrorOperation,
      ) => presentUserSafeError(error, { locale, surface, operation }),
      text: (
        error: unknown,
        surface: ErrorSurface,
        operation: ErrorOperation,
      ) => userSafeErrorText(error, { locale, surface, operation }),
    }),
    [locale],
  );
}
