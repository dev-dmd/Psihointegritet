"use client";

import { useState } from "react";

import { submitAuth } from "@/features/auth/submit";

/**
 * One button that spends a verification link.
 *
 * A button and not an effect on mount, deliberately. Mail clients and
 * corporate link scanners open every URL in a message before a person sees
 * it, so verifying on page load would let a scanner spend the token and leave
 * the owner with a link that no longer works and no way to ask for another.
 * A press is the cheapest proof that a human opened the mail.
 *
 * The token is held in state and posted, never rendered: it is a credential
 * until it is spent, and the address bar is already more exposure than it
 * deserves.
 */
export function VerifyEmailForm({
  token,
  copy,
}: {
  token: string;
  copy: {
    submitLabel: string;
    workingLabel: string;
    doneLabel: string;
    doneLead: string;
    signInLabel: string;
    signInHref: string;
    unreachable: string;
  };
}) {
  const [state, setState] = useState<"idle" | "working" | "done">("idle");
  const [error, setError] = useState<string | null>(null);

  if (state === "done") {
    return (
      <div className="mt-8">
        <p className="text-coffee/70 text-[16px] leading-[1.7]">
          {copy.doneLead}
        </p>
        <a
          href={copy.signInHref}
          className="bg-forest mt-6 inline-flex h-12 items-center rounded-full px-6 text-[15px] font-semibold text-white"
        >
          {copy.signInLabel}
        </a>
      </div>
    );
  }

  return (
    <form
      className="mt-8"
      onSubmit={async (event) => {
        event.preventDefault();
        setState("working");
        setError(null);
        // The same helper the sign-in and reset forms use. It lives in a `.ts`
        // because the architecture check keeps network calls out of component
        // files, and it is right to.
        const result = await submitAuth(
          "/api/auth/verify-email",
          { token },
          copy.unreachable,
        );
        if (!result.ok) {
          setError(result.message ?? copy.unreachable);
          setState("idle");
          return;
        }
        setState("done");
      }}
    >
      {error ? (
        <p role="alert" className="mb-4 text-[14px] text-red-700">
          {error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={state === "working"}
        className="bg-forest inline-flex h-12 items-center rounded-full px-6 text-[15px] font-semibold text-white disabled:opacity-60"
      >
        {state === "working" ? copy.workingLabel : copy.submitLabel}
      </button>
    </form>
  );
}
