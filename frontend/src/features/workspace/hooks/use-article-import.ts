"use client";

import { useMutation } from "@tanstack/react-query";

import {
  importRichDocDocx,
  type RichDocNormalizationResult,
} from "../content-api";

/**
 * Word import for a staff RichDoc field.
 *
 * No cache writes on purpose: the conversion is a proposal the author reads
 * and applies, not a change to any stored entity. It becomes real only when
 * the revision is saved.
 */
export function useArticleImportMutation(callbacks: {
  onConverted: (result: RichDocNormalizationResult) => void;
  onFailed: (error: unknown) => void;
}) {
  return useMutation({
    mutationFn: (file: File) => importRichDocDocx(file),
    onSuccess: callbacks.onConverted,
    onError: callbacks.onFailed,
  });
}
