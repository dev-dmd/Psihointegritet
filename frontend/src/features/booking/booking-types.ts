/**
 * Plain-language matching context attached to a submitted request. It never
 * contains matching scores and is never placed in a URL.
 */
export interface BookingSummary {
  answers: { question: string; answer: string }[];
  extraText?: string;
  recommendedService?: string;
  recommendedTherapist?: string;
  alternativeTherapist?: string;
  reasons?: string[];
  format?: string;
  location?: string;
  priorTherapy?: string;
  needsManualReview?: boolean;
}
