"use client";

import { useState } from "react";

interface BookingRequestFormProps {
  /** Therapist slug, or null for an unassigned request → the whole team. */
  therapistSlug: string | null;
  therapistName: string;
  /** Surface tone: "light" on a colored strip, "surface" on plain background. */
  tone?: "light" | "surface";
}

/**
 * Demo appointment-request form. Date/time are read-only placeholders — real
 * slot selection is the R2 Booking Engine. Submitting emails the request to the
 * therapist (or the whole team when unassigned) and confirms to the requester.
 * Every surface states this is a request, not a confirmed appointment (T6).
 */
export function BookingRequestForm({
  therapistSlug,
  therapistName,
  tone = "light",
}: BookingRequestFormProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const valid = name.trim() && /.+@.+\..+/.test(email);

  const fieldBase =
    tone === "light"
      ? "border-coffee/20 bg-canvas/70"
      : "border-coffee/15 bg-surface";

  const submit = async () => {
    setSending(true);
    setError(null);
    try {
      const response = await fetch("/api/booking-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          therapistSlug,
          therapistName,
          name: name.trim(),
          email: email.trim(),
        }),
      });
      if (!response.ok) {
        throw new Error("send-failed");
      }
      setDone(true);
    } catch {
      setError(
        "Slanje trenutno nije uspelo. Pokušajte ponovo za koji trenutak.",
      );
    } finally {
      setSending(false);
    }
  };

  if (done) {
    return (
      <div className="bg-canvas/80 rounded-2xl px-5 py-5">
        <div className="text-forest mb-1.5 font-serif text-[20px]">
          Zahtev je poslat
        </div>
        <p className="text-coffee/75 text-[14px] leading-[1.6]">
          Poslali smo vam potvrdu na email. Ovo nije potvrda termina —{" "}
          {therapistSlug === null ? "tim" : therapistName.split(" ")[0]} će vam
          se javiti radi dogovora o tačnom terminu.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-coffee/70 text-[13px] leading-[1.5]">
        Ovo je <strong>zahtev za termin</strong>, ne potvrda. Tačan datum i
        vreme dogovarate nakon što se javimo.
      </p>

      <div className="grid grid-cols-2 gap-3">
        <label className="text-coffee/60 text-[12px] font-medium">
          Datum
          <input
            type="text"
            readOnly
            value="Dogovara se nakon zahteva"
            aria-label="Datum — dogovara se nakon zahteva"
            className={`mt-1 w-full cursor-not-allowed rounded-xl border ${fieldBase} text-coffee/45 px-3 py-2.5 text-[13.5px]`}
          />
        </label>
        <label className="text-coffee/60 text-[12px] font-medium">
          Vreme
          <input
            type="text"
            readOnly
            value="Dogovara se nakon zahteva"
            aria-label="Vreme — dogovara se nakon zahteva"
            className={`mt-1 w-full cursor-not-allowed rounded-xl border ${fieldBase} text-coffee/45 px-3 py-2.5 text-[13.5px]`}
          />
        </label>
      </div>

      <label className="text-coffee/70 text-[12.5px] font-medium">
        Ime i prezime
        <input
          type="text"
          value={name}
          onChange={(event) => setName(event.target.value)}
          className={`text-coffee focus:border-sage mt-1 w-full rounded-xl border ${fieldBase} px-3.5 py-2.5 text-[15px] outline-none`}
        />
      </label>
      <label className="text-coffee/70 text-[12.5px] font-medium">
        Email
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className={`text-coffee focus:border-sage mt-1 w-full rounded-xl border ${fieldBase} px-3.5 py-2.5 text-[15px] outline-none`}
        />
      </label>

      {error ? (
        <p className="text-danger text-[13px]" role="alert">
          {error}
        </p>
      ) : null}

      <button
        type="button"
        onClick={submit}
        disabled={sending || !valid}
        className="bg-forest text-canvas hover:bg-forest-hover mt-1 cursor-pointer self-start rounded-full border-0 px-7 py-[13px] text-[15px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50"
      >
        {sending ? "Šaljemo…" : "Zakaži termin"}
      </button>
    </div>
  );
}
