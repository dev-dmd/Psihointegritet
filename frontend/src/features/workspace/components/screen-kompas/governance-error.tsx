"use client";

export function GovernanceError({ error }: { error: string | null }) {
  return error ? (
    <p
      role="alert"
      className="border-danger/45 bg-danger/8 text-ink-70 rounded-tile mt-3 border px-3 py-2.5 text-[12.5px] leading-[1.5]"
    >
      {error}
    </p>
  ) : null;
}

/** K2.8 — a field-scoped message rendered next to its input and referenced by
 * `aria-describedby`, so only unexpected failures reach the global banner. */
export function FieldError({
  message,
  id,
}: {
  message: string | undefined;
  id: string;
}) {
  return message ? (
    <p
      id={id}
      role="alert"
      className="text-danger mt-1.5 text-[12px] leading-[1.4]"
    >
      {message}
    </p>
  ) : null;
}
