import { z } from "zod";

const safeParamSchema = z.union([z.string(), z.number(), z.boolean()]);

export const apiFieldErrorSchema = z.object({
  code: z.string().min(1),
  params: z.record(z.string(), safeParamSchema).optional(),
});

/** Stable problem-details envelope shared with the FastAPI backend. Unknown
 * backend keys (including prose and technical identifiers) are stripped. */
export const apiProblemSchema = z.object({
  type: z.string().optional(),
  status: z.number().int(),
  code: z.string().min(1),
  params: z.record(z.string(), safeParamSchema).optional(),
  fieldPath: z.string().optional(),
  fieldErrors: z.record(z.string(), z.array(apiFieldErrorSchema)).optional(),
});

export type ApiProblem = z.infer<typeof apiProblemSchema>;

export function isApiProblem(value: unknown): value is ApiProblem {
  return apiProblemSchema.safeParse(value).success;
}
