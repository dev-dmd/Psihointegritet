import { z } from "zod";

const apiProblemEnvelopeSchema = z.object({
  status: z.number().int(),
  code: z.string().min(1),
  params: z
    .record(z.string(), z.union([z.string(), z.number(), z.boolean()]))
    .optional(),
  fieldPath: z.string().optional(),
  fieldErrors: z.record(z.string(), z.array(z.string())).optional(),
});

/**
 * Error raised by same-origin frontend adapters. The body is parsed only to a
 * narrow public envelope; raw provider/backend payloads never leak into UI.
 */
export class JsonRequestError extends Error {
  constructor(
    readonly status: number,
    message = "Request failed",
    readonly code?: string,
    readonly params?: Record<string, string | number | boolean>,
    readonly fieldPath?: string,
    readonly fieldErrors?: Record<string, string[]>,
  ) {
    super(message);
    this.name = "JsonRequestError";
  }
}

async function readJson(response: Response): Promise<unknown> {
  const mediaType = (response.headers.get("content-type") ?? "")
    .split(";", 1)[0]
    ?.trim()
    .toLowerCase();
  const isJson =
    mediaType === "application/json" ||
    (mediaType?.startsWith("application/") === true &&
      mediaType.endsWith("+json"));
  if (!isJson) {
    return null;
  }

  try {
    return await response.json();
  } catch {
    return null;
  }
}

export async function requestJson<TResult>(
  input: RequestInfo | URL,
  init: RequestInit,
  responseSchema: z.ZodType<TResult>,
): Promise<TResult> {
  const response = await fetch(input, init);
  const payload = await readJson(response);

  if (!response.ok) {
    const parsedProblem = apiProblemEnvelopeSchema.safeParse(payload);
    if (parsedProblem.success) {
      const problem = parsedProblem.data;
      throw new JsonRequestError(
        response.status,
        "Request failed",
        problem.code,
        problem.params,
        problem.fieldPath,
        problem.fieldErrors,
      );
    }

    throw new JsonRequestError(response.status);
  }

  const parsed = responseSchema.safeParse(payload);
  if (!parsed.success) {
    throw new JsonRequestError(
      response.status,
      "Response did not match the expected contract",
    );
  }

  return parsed.data;
}

export async function postJson<TPayload, TResult>(
  path: string,
  payload: TPayload,
  responseSchema: z.ZodType<TResult>,
): Promise<TResult> {
  return requestJson(
    path,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
    responseSchema,
  );
}
