import { errors as en } from "@/messages/en/errors";
import { errors as srLatn } from "@/messages/sr-Latn/errors";
import type { UiLocale } from "@/i18n/locales";
import { JsonRequestError } from "@/lib/api/request-json";
import type { Widen } from "@/messages/types";

import { isApiProblem, type ApiProblem } from "./api-problem";

export type ErrorSurface =
  | "generic"
  | "content"
  | "legal"
  | "taxonomy"
  | "research"
  | "compass"
  | "diagnostics"
  | "organization"
  | "booking";

export type ErrorOperation =
  "request" | "load" | "change" | "import" | "publish" | "run" | "submit";

export interface UserSafeErrorPresentation {
  message: string;
  nextAction: string;
  fieldErrors: Record<string, string>;
}

type MachineError = {
  status?: number;
  code?: string;
  fieldPath?: string;
  fieldErrors?: ApiProblem["fieldErrors"];
};

type ErrorCatalog = Widen<typeof en>;

const fieldErrorCatalogKeys = {
  missing: "missing",
  int_parsing: "intParsing",
  float_parsing: "floatParsing",
  bool_parsing: "boolParsing",
  uuid_parsing: "uuidParsing",
  string_too_short: "stringTooShort",
  string_too_long: "stringTooLong",
  value_error: "valueError",
} as const;

const codeOverrideCatalogKeys = {
  file_type_invalid: "fileTypeInvalid",
  taxonomy_stable_id_conflict: "taxonomyStableIdConflict",
  "TAX-ID-001": "taxonomyInvalidId",
  "TAX-SYSTEM-001": "taxonomySystemLocked",
  "TAX-LOCK-001": "taxonomyOptimisticLock",
  "COMPASS-FLOW-LOCK-001": "compassOptimisticLock",
  "ORG-AUTH-002": "organizationOperatorReasonRequired",
  BOOKING_CONFLICT: "bookingConflict",
  BOOKING_SLOT_CONFLICT: "bookingSlotConflict",
  DIAGNOSTIC_NOT_FOUND: "diagnosticNotFound",
} as const;

const catalogs: Record<UiLocale, ErrorCatalog> = {
  en,
  "sr-Latn": srLatn,
};

function machineError(error: unknown): MachineError | null {
  if (error instanceof JsonRequestError) {
    return {
      status: error.status,
      ...(error.code ? { code: error.code } : {}),
      ...(error.fieldPath ? { fieldPath: error.fieldPath } : {}),
      ...(error.fieldErrors ? { fieldErrors: error.fieldErrors } : {}),
    };
  }
  // Do not treat arbitrary Error instances as public problem envelopes. Some
  // libraries attach enumerable status/code fields to errors together with raw
  // provider prose; only our response boundary may construct a trusted Error.
  if (error instanceof Error) return null;
  if (isApiProblem(error)) {
    return {
      status: error.status,
      code: error.code,
      ...(error.fieldPath ? { fieldPath: error.fieldPath } : {}),
      ...(error.fieldErrors ? { fieldErrors: error.fieldErrors } : {}),
    };
  }
  return null;
}

function statusAction(
  catalog: ErrorCatalog,
  status: number | undefined,
): string {
  if (status === undefined) return catalog.actions.network;
  if (status === 401) return catalog.actions.unauthorized;
  if (status === 403) return catalog.actions.forbidden;
  if (status === 404) return catalog.actions.notFound;
  if (status === 409) return catalog.actions.conflict;
  if (status === 413) return catalog.actions.tooLarge;
  if (status === 422) return catalog.actions.validation;
  if (status === 429) return catalog.actions.rateLimited;
  if (status === 502 || status === 503 || status === 504) {
    return catalog.actions.unavailable;
  }
  if (status >= 500) return catalog.actions.server;
  return catalog.actions.generic;
}

function surfaceMessage(
  catalog: ErrorCatalog,
  surface: ErrorSurface,
  operation: ErrorOperation,
): string {
  const surfaces = catalog.surfaces as Record<string, Record<string, string>>;
  return (
    surfaces[surface]?.[operation] ??
    surfaces.generic?.request ??
    "Request not completed."
  );
}

function localizedFieldErrors(
  catalog: ErrorCatalog,
  machine: MachineError | null,
): Record<string, string> {
  if (!machine) return {};
  const copy = catalog.fieldErrors as Record<string, string>;
  const fields: Record<string, string> = {};
  for (const [path, errors] of Object.entries(machine.fieldErrors ?? {})) {
    const first = errors[0];
    if (first) {
      const key =
        fieldErrorCatalogKeys[first.code as keyof typeof fieldErrorCatalogKeys];
      fields[normalizeFieldPath(path)] =
        (key ? copy[key] : undefined) ?? copy.fallback ?? "Check this field.";
    }
  }
  return fields;
}

/**
 * The only user-facing API error mapper.
 *
 * It never reads `Error.message`, backend `title`/`detail`, raw response text,
 * correlation/digest/trace/incident identifiers or an unknown code as copy.
 */
export function presentUserSafeError(
  error: unknown,
  input: {
    locale: UiLocale;
    surface: ErrorSurface;
    operation: ErrorOperation;
  },
): UserSafeErrorPresentation {
  const catalog = catalogs[input.locale];
  const machine = machineError(error);
  const overrides = catalog.codeOverrides as Record<
    string,
    { message: string; nextAction: string }
  >;
  const overrideKey = machine?.code
    ? codeOverrideCatalogKeys[
        machine.code as keyof typeof codeOverrideCatalogKeys
      ]
    : undefined;
  const override = overrideKey ? overrides[overrideKey] : undefined;
  const fieldErrors = localizedFieldErrors(catalog, machine);

  if (machine?.fieldPath && Object.keys(fieldErrors).length === 0) {
    fieldErrors[normalizeFieldPath(machine.fieldPath)] =
      catalog.fieldErrors.fallback;
  }

  return {
    message:
      override?.message ??
      surfaceMessage(catalog, input.surface, input.operation),
    nextAction: override?.nextAction ?? statusAction(catalog, machine?.status),
    fieldErrors,
  };
}

export function normalizeFieldPath(path: string): string {
  return path
    .replace(/^body\./, "")
    .replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase());
}

export function userSafeErrorText(
  error: unknown,
  input: {
    locale: UiLocale;
    surface: ErrorSurface;
    operation: ErrorOperation;
  },
): string {
  const presentation = presentUserSafeError(error, input);
  return `${presentation.message} ${presentation.nextAction}`;
}
