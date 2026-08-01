import { z } from "zod";

import type { CompanyAnswers } from "@/content/company";
import { postJson } from "@/lib/api/request-json";

export interface CompanyInquiryPayload {
  model: {
    name: string;
    price: string;
  };
  answers: CompanyAnswers;
  contact: {
    companyName: string;
    contactName: string;
    email: string;
    phone?: string;
    message?: string;
  };
}

const companyInquiryResponseSchema = z.object({ ok: z.literal(true) });

export type CompanyInquiryResponse = z.infer<
  typeof companyInquiryResponseSchema
>;

export function submitCompanyInquiry(
  payload: CompanyInquiryPayload,
): Promise<CompanyInquiryResponse> {
  return postJson(
    "/api/company-inquiry",
    payload,
    companyInquiryResponseSchema,
  );
}
