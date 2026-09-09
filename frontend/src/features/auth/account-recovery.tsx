"use client";

import { useState } from "react";

import { submitAuth } from "@/features/auth/submit";

/**
 * The two ways back into an account, beside the form that refused you.
 *
 * A forgotten password and an unconfirmed address produce the *same* sign-in
 * refusal — deliberately, since telling them apart would tell a stranger which
 * addresses are registered. That is right, and it leaves the person who is
 * genuinely stuck with no idea which of the two they are. So both ways out are
 * offered here, unconditionally, and they pick.
 *
 * **Every outcome renders the same sentence.** No account, no such address,
 * already verified, asked again a moment ago — the backend answers 204 to all
 * of them and this shows one confirmation, because a UI that distinguished them
 * would hand back exactly what the 204 withholds. The only different answer is
 * a backend that could not be reached, which is true whatever was typed.
 */

export interface AccountRecoveryCopy {
  forgotAction: string;
  resendAction: string;
  forgotLead: string;
  resendLead: string;
  emailLabel: string;
  submitLabel: string;
  workingLabel: string;
  cancelLabel: string;
  doneLead: string;
  unreachable: string;
}

type Mode = "forgot" | "resend";

const ENDPOINT: Record<Mode, string> = {
  forgot: "/api/auth/forgot-password",
  resend: "/api/auth/resend-verification",
};

export function AccountRecovery({ copy }: { copy: AccountRecoveryCopy }) {
  const [mode, setMode] = useState<Mode | null>(null);
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function open(next: Mode) {
    setMode(next);
    setSent(false);
    setError(null);
  }

  if (sent) {
    return (
      <p
        role="status"
        className="text-coffee/70 border-coffee/10 mt-6 rounded-xl border bg-white/60 px-4 py-3 text-[14px] leading-[1.6]"
      >
        {copy.doneLead}
      </p>
    );
  }

  if (mode === null) {
    return (
      <div className="mt-6 flex flex-col items-start gap-2">
        <RecoveryLink
          label={copy.forgotAction}
          onClick={() => open("forgot")}
        />
        <RecoveryLink
          label={copy.resendAction}
          onClick={() => open("resend")}
        />
      </div>
    );
  }

  return (
    <form
      className="border-coffee/10 mt-6 flex flex-col gap-3 rounded-xl border bg-white/60 px-4 py-4"
      onSubmit={async (event) => {
        event.preventDefault();
        if (pending) return;
        const address = String(
          new FormData(event.currentTarget).get("email") ?? "",
        );
        setPending(true);
        setError(null);
        const result = await submitAuth(
          ENDPOINT[mode],
          { email: address },
          copy.unreachable,
        );
        setPending(false);
        if (!result.ok) {
          setError(result.message ?? copy.unreachable);
          return;
        }
        setSent(true);
      }}
    >
      <p className="text-coffee/70 text-[14px] leading-[1.6]">
        {mode === "forgot" ? copy.forgotLead : copy.resendLead}
      </p>

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

      {error ? (
        <p role="alert" className="text-[14px] text-red-700">
          {error}
        </p>
      ) : null}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="bg-coffee text-canvas hover:bg-coffee/90 cursor-pointer rounded-full px-5 py-2.5 text-[14px] font-semibold transition-colors disabled:cursor-progress disabled:opacity-60"
        >
          {pending ? copy.workingLabel : copy.submitLabel}
        </button>
        <RecoveryLink label={copy.cancelLabel} onClick={() => setMode(null)} />
      </div>
    </form>
  );
}

/** `type="button"`, or every one of these submits the form it sits in. */
function RecoveryLink({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-coffee/60 hover:text-coffee cursor-pointer text-[14px] underline transition-colors"
    >
      {label}
    </button>
  );
}
