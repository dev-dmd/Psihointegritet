import { z } from "zod";

import { apiProblemSchema, type ApiProblem } from "@/lib/errors/api-problem";

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
    readonly fieldErrors?: ApiProblem["fieldErrors"],
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

function errorForResponse(
  response: Response,
  payload: unknown,
): JsonRequestError {
  const parsedProblem = apiProblemSchema.safeParse(payload);
  if (!parsedProblem.success) return new JsonRequestError(response.status);
  const problem = parsedProblem.data;
  return new JsonRequestError(
    response.status,
    "Request failed",
    problem.code,
    problem.params,
    problem.fieldPath,
    problem.fieldErrors,
  );
}

/** Shared response boundary for hand-shaped API clients. It preserves only
 * machine-safe problem fields and never copies backend prose into Error.message. */
export async function parseJsonResponse<TResult>(
  response: Response,
): Promise<TResult> {
  const payload = await readJson(response);
  if (!response.ok) throw errorForResponse(response, payload);
  if (response.status === 204) return undefined as TResult;
  return payload as TResult;
}

export async function requestJson<TResult>(
  input: RequestInfo | URL,
  init: RequestInit,
  responseSchema: z.ZodType<TResult>,
): Promise<TResult> {
  const response = await fetch(input, init);
  const payload = await readJson(response);

  if (!response.ok) {
    throw errorForResponse(response, payload);
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
