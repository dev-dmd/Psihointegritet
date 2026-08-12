"use client";

import { useMutation } from "@tanstack/react-query";

import {
  submitPublicIntakeCase,
  type PublicIntakeSubmissionPayload,
} from "../public-intake-api";

interface PublicIntakeSubmissionVariables {
  payload: PublicIntakeSubmissionPayload;
  idempotencyKey: string;
}

export function usePublicIntakeSubmission() {
  return useMutation({
    mutationFn: ({
      payload,
      idempotencyKey,
    }: PublicIntakeSubmissionVariables) =>
      submitPublicIntakeCase(payload, idempotencyKey),
  });
}
