"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";

import { sanjaContent } from "@/features/tenants/sanja-neuer/content";
import { useBooking } from "@/features/tenants/sanja-neuer/booking/booking-context";
import { useScrollLock } from "@/features/tenants/sanja-neuer/hooks/use-scroll-lock";
import {
  ConsentField,
  SelectField,
  TextAreaField,
  TextField,
} from "@/features/tenants/sanja-neuer/booking/booking-fields";

const { booking } = sanjaContent;

type Status = "idle" | "submitting" | "sent" | "error";

/**
 * The page's one conversion point.
 *
 * The prototype had two states, idle and sent. Production needs four: a request
 * can be in flight, and it can fail. Leaving those out is how a visitor presses
 * submit twice and then assumes it worked.
 *
 * Nothing is wired to a backend yet — `onSubmit` resolves locally so the flow
 * is complete and reviewable. The seam is one function: replace the timeout
 * with `POST /api/booking` and the states already exist to represent it.
 */
/**
 * Mounted only while open, which is what makes the form start clean.
 *
 * The alternative — keeping it mounted and resetting `status` in an effect —
 * resets state during render and is what `react-hooks/set-state-in-effect`
 * exists to catch. Unmounting costs nothing here: the entrance animation runs
 * on mount, and the design gives the modal no exit animation to interrupt.
 */
export function SanjaBookingModalMount() {
  const { isOpen } = useBooking();
  return isOpen ? <SanjaBookingModal /> : null;
}

function SanjaBookingModal() {
  const { close } = useBooking();
  const [status, setStatus] = useState<Status>("idle");
  const closeRef = useRef<HTMLButtonElement>(null);

  useScrollLock(true);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [close]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("submitting");
    // Placeholder for `POST /api/booking`. Deliberately not a fake failure
    // path: until the route exists, the honest local outcome is success.
    await new Promise((resolve) => setTimeout(resolve, 400));
    setStatus("sent");
  }

  return (
    <div
      onClick={close}
      className="bg-sn-ink/55 fixed inset-0 z-100 flex items-start justify-center overflow-y-auto p-6 backdrop-blur-[6px] motion-safe:animate-[sn-fade_0.2s_ease_both]"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="sn-booking-title"
        onClick={(event) => event.stopPropagation()}
        className="bg-sn-ivory border-sn-ink/14 shadow-sn-modal m-auto w-full max-w-[620px] overflow-hidden rounded-3xl border motion-safe:animate-[sn-rise_0.3s_ease_both]"
      >
        <div className="flex items-start justify-between gap-4 px-8 pt-7">
          <div>
            <span className="text-sn-lilac-deep text-[11px] tracking-[0.24em] uppercase">
              {booking.eyebrow}
            </span>
            <h2
              id="sn-booking-title"
              className="font-sn-display text-sn-ink mt-3 mb-2 text-[31px] leading-[1.24] font-normal"
            >
              {booking.title}
            </h2>
            <p className="text-sn-ink/68 text-sm leading-[1.7]">
              {booking.lead}
            </p>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={close}
            aria-label={booking.close}
            className="border-sn-ink/20 text-sn-ink hover:bg-sn-ink hover:text-sn-ivory focus-visible:ring-sn-burgundy/40 size-9 shrink-0 cursor-pointer rounded-full border text-base transition-colors outline-none focus-visible:ring-2"
          >
            ×
          </button>
        </div>

        {status === "sent" ? (
          <div className="p-8 text-center">
            <p className="font-sn-display text-sn-burgundy mb-2.5 text-[27px]">
              {booking.successTitle}
            </p>
            <p className="text-sn-ink/72 mb-6 text-[15px] leading-[1.7]">
              {booking.successBody}
            </p>
            <button
              type="button"
              onClick={close}
              className="bg-sn-burgundy text-sn-ivory hover:bg-sn-ink cursor-pointer rounded-full px-7 py-3.5 text-xs tracking-[0.1em] uppercase transition-colors"
            >
              {booking.successClose}
            </button>
          </div>
        ) : (
          <form
            onSubmit={onSubmit}
            className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,220px),1fr))] gap-4 px-8 pt-[26px] pb-8"
          >
            <TextField
              name="ime"
              label={booking.fields.name.label}
              placeholder={booking.fields.name.placeholder}
              required
            />
            <TextField
              name="email"
              type="email"
              label={booking.fields.email.label}
              placeholder={booking.fields.email.placeholder}
              required
            />
            <TextField
              name="telefon"
              type="tel"
              label={booking.fields.phone.label}
              placeholder={booking.fields.phone.placeholder}
            />
            <SelectField
              name="usluga"
              label={booking.fields.service.label}
              options={booking.fields.service.options}
            />
            <SelectField
              name="termin"
              label={booking.fields.slot.label}
              options={booking.fields.slot.options}
            />
            <SelectField
              name="jezik"
              label={booking.fields.language.label}
              options={booking.fields.language.options}
            />
            <TextAreaField
              name="tema"
              label={booking.fields.topic.label}
              placeholder={booking.fields.topic.placeholder}
            />
            <ConsentField name="saglasnost" label={booking.fields.consent} />

            {status === "error" ? (
              <p
                role="alert"
                className="text-sn-burgundy col-span-full text-[13px] leading-[1.6]"
              >
                {booking.errorBody}
              </p>
            ) : null}

            <div className="col-span-full mt-1 flex flex-wrap items-center justify-between gap-3.5">
              <span className="text-sn-ink/55 text-[13px]">
                {booking.freeNote}
              </span>
              <button
                type="submit"
                disabled={status === "submitting"}
                className="bg-sn-burgundy text-sn-ivory hover:bg-sn-ink cursor-pointer rounded-full px-8 py-4 text-[13px] tracking-[0.1em] uppercase transition-colors disabled:cursor-wait disabled:opacity-70"
              >
                {status === "submitting" ? booking.submitting : booking.submit}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
