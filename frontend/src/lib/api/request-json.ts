import { z } from "zod";

const errorEnvelopeSchema = z.object({
  error: z.string().optional(),
});

/**
 * Error raised by same-origin frontend adapters. The body is parsed only to a
 * narrow public envelope; raw provider/backend payloads never leak into UI.
 */
export class JsonRequestError extends Error {
  constructor(
    readonly status: number,
    message = "Request failed",
  ) {
    super(message);
    this.name = "JsonRequestError";
  }
}

async function readJson(response: Response): Promise<unknown> {
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
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
    const parsedError = errorEnvelopeSchema.safeParse(payload);
    throw new JsonRequestError(
      response.status,
      parsedError.success && parsedError.data.error
        ? parsedError.data.error
        : "Request failed",
    );
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
