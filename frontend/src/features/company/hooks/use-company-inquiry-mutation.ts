"use client";

import { useMutation } from "@tanstack/react-query";

import {
  submitCompanyInquiry,
  type CompanyInquiryPayload,
} from "@/lib/api/company-inquiry";

export const companyInquiryMutationKey = ["public", "company-inquiry"] as const;

export function useCompanyInquiryMutation() {
  return useMutation({
    mutationKey: companyInquiryMutationKey,
    mutationFn: (payload: CompanyInquiryPayload) =>
      submitCompanyInquiry(payload),
    retry: false,
  });
}
