"use client";

import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { submitAuth } from "@/features/auth/submit";

/**
 * The one form behind sign-in, registration and setting a password.
 *
 * Three near-identical forms is three places for the error handling, the
 * pending state and the `autoComplete` hints to drift. The differences between
 * them are data — which fields, which endpoint, where to go afterwards — so
 * they are props.
 *
 * Every string arrives from the server as a prop. The copy lives in
 * `src/messages/`, and a client component that reached for a translator would
 * either ship the catalogue to the browser or grow Serbian literals, which the
 * architecture check refuses (I18N-5).
 *
 * The response this posts to carries `{ ok: true }` and nothing else — the
 * session is an `HttpOnly` cookie the server set on the way past. There is
 * deliberately no token for this component to hold.
 */

export interface CredentialsFormCopy {
  emailLabel: string;
  passwordLabel: string;
  nameLabel: string;
  nameOptional: string;
  submitLabel: string;
  workingLabel: string;
  unreachable: string;
}

export function CredentialsForm({
  endpoint,
  redirectTo,
  copy,
  withName = false,
  hiddenToken,
  passwordAutoComplete = "current-password",
  minPasswordLength,
}: {
  endpoint: string;
  /** Where to go once the cookie is set. Already validated on the server. */
  redirectTo: string;
  copy: CredentialsFormCopy;
  withName?: boolean;
  /**
   * A one-time token from a reset link. Present only on `/nova-lozinka`, where
   * it replaces the email field: the token already names the account, so asking
   * for an address as well would let somebody spend a link against a different
   * one.
   */
  hiddenToken?: string;
  passwordAutoComplete?: "current-password" | "new-password";
  minPasswordLength?: number;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;

    const form = new FormData(event.currentTarget);
    const body: Record<string, string> = {
      password: String(form.get("password") ?? ""),
    };
    if (hiddenToken) body.token = hiddenToken;
    else body.email = String(form.get("email") ?? "");
    if (withName) body.displayName = String(form.get("displayName") ?? "");

    setPending(true);
    setError(null);
    const result = await submitAuth(endpoint, body, copy.unreachable);
    if (!result.ok) {
      setPending(false);
      setError(result.message);
      return;
    }

    // `refresh()` after `replace()` matters: the server components above this
    // one rendered without a session, and without it the shell would keep
    // showing the signed-out view until something else invalidated the cache.
    // Typed routes cannot check a value resolved at runtime. The cast is
    // safe because `safeReturnPath` on the server already refused anything
    // that is not a same-site absolute path.
    router.replace(redirectTo as Route);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="mt-8 flex flex-col gap-4">
      {withName ? (
        <label className="flex flex-col gap-1.5">
          <span className="text-coffee/70 text-[14px]">
            {copy.nameLabel}{" "}
            <span className="text-coffee/40">({copy.nameOptional})</span>
          </span>
          <input
            name="displayName"
            type="text"
            autoComplete="name"
            className="border-coffee/15 focus:border-sage text-coffee rounded-xl border bg-white px-4 py-3 text-[16px] outline-none"
          />
        </label>
      ) : null}

      {hiddenToken ? null : (
        <label className="flex flex-col gap-1.5">
          <span className="text-coffee/70 text-[14px]">{copy.emailLabel}</span>
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            autoCapitalize="none"
            spellCheck={false}
            className="border-coffee/15 focus:border-sage text-coffee rounded-xl border bg-white px-4 py-3 text-[16px] outline-none"
          />
        </label>
      )}

      <label className="flex flex-col gap-1.5">
        <span className="text-coffee/70 text-[14px]">{copy.passwordLabel}</span>
        <input
          name="password"
          type="password"
          required
          minLength={minPasswordLength}
          autoComplete={passwordAutoComplete}
          className="border-coffee/15 focus:border-sage text-coffee rounded-xl border bg-white px-4 py-3 text-[16px] outline-none"
        />
      </label>

      {/* `role="alert"` so the refusal is announced. Somebody using a screen
          reader would otherwise submit, hear nothing, and try again. */}
      {error ? (
        <p role="alert" className="text-[14px] text-red-700">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="bg-coffee text-canvas hover:bg-coffee/90 mt-2 cursor-pointer rounded-full px-6 py-3.5 text-[15px] font-semibold transition-colors disabled:cursor-progress disabled:opacity-60"
      >
        {pending ? copy.workingLabel : copy.submitLabel}
      </button>
    </form>
  );
}
