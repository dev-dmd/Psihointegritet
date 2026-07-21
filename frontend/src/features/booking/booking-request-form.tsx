"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { formatRsd, serviceCatalog } from "@/content/services";
import { findTherapist, therapists } from "@/content/therapists";
import {
  type BookingContext,
  type BookingFormat,
  type BookingLocation,
  locationLabel,
  locationsForTherapist,
  servicesForTherapist,
  therapistProvidesService,
  therapistsForService,
} from "@/features/booking/booking-context";
import { consumeBookingSummary } from "@/features/booking/booking-summary-storage";
import type { BookingSummary } from "@/features/booking/booking-types";

export type { BookingSummary } from "@/features/booking/booking-types";

type Step = 1 | 2 | 3 | 4 | 5;

interface BookingRequestFormProps {
  initialContext?: BookingContext;
  summary?: BookingSummary;
  /**
   * Compatibility for the existing profile and drawer surfaces during the
   * route migration. New route-level callers should use `initialContext`.
   */
  therapistSlug?: string | null;
  therapistName?: string;
  tone?: "light" | "surface";
}

const directContext: BookingContext = {
  serviceSlug: null,
  therapistSlug: null,
  format: null,
  source: null,
  messages: [],
};

const timeOfDayOptions = ["Prepodne", "Popodne", "Veče"] as const;

function initialContextFromProps({
  initialContext,
  therapistSlug,
}: BookingRequestFormProps): BookingContext {
  if (initialContext) return initialContext;
  return {
    ...directContext,
    therapistSlug: therapistSlug ?? null,
  };
}

/**
 * Public demo request flow. It records a request only; availability is checked
 * by the therapist or team afterwards. Slot booking, persistence and policy
 * management remain in the future backend Booking Engine.
 */
export function BookingRequestForm(props: BookingRequestFormProps) {
  const context = initialContextFromProps(props);
  const [started, setStarted] = useState(
    context.serviceSlug !== null || context.therapistSlug !== null,
  );
  const [step, setStep] = useState<Step>(1);
  const [serviceSlug, setServiceSlug] = useState<string | null>(
    context.serviceSlug,
  );
  const [therapistSlug, setTherapistSlug] = useState<string | null>(
    context.therapistSlug,
  );
  const [format, setFormat] = useState<BookingFormat | null>(context.format);
  const [location, setLocation] = useState<BookingLocation | null>(null);
  const [preferredDate, setPreferredDate] = useState("");
  const [preferredTime, setPreferredTime] = useState("");
  const [alternativeDate, setAlternativeDate] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [replyPreference, setReplyPreference] = useState<"email" | "phone">(
    "email",
  );
  const [message, setMessage] = useState("");
  const [bookingRulesAccepted, setBookingRulesAccepted] = useState(false);
  const [website, setWebsite] = useState("");
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectionMessage, setSelectionMessage] = useState<string | null>(null);
  const [storedSummary] = useState<BookingSummary | undefined>(() =>
    props.summary ? undefined : consumeBookingSummary(),
  );

  const summary = props.summary ?? storedSummary;
  const selectedService = useMemo(
    () =>
      serviceCatalog.find((service) => service.slug === serviceSlug) ?? null,
    [serviceSlug],
  );
  const selectedTherapist = therapistSlug
    ? (findTherapist(therapistSlug) ?? null)
    : null;
  const serviceOptions = therapistSlug
    ? servicesForTherapist(therapistSlug)
    : serviceCatalog;
  const therapistOptions = serviceSlug
    ? therapistsForService(serviceSlug)
    : therapists;
  const locationOptions = locationsForTherapist(therapistSlug);

  const changeService = (nextServiceSlug: string) => {
    setServiceSlug(nextServiceSlug || null);
    if (
      therapistSlug !== null &&
      nextServiceSlug &&
      !therapistProvidesService(therapistSlug, nextServiceSlug)
    ) {
      setTherapistSlug(null);
      setSelectionMessage(
        "Terapeut je vraćen na izbor tima jer ne pruža izabranu uslugu.",
      );
    } else {
      setSelectionMessage(null);
    }
  };

  const changeTherapist = (nextTherapistSlug: string) => {
    const next = nextTherapistSlug || null;
    setTherapistSlug(next);
    if (
      next !== null &&
      serviceSlug !== null &&
      !therapistProvidesService(next, serviceSlug)
    ) {
      setServiceSlug(null);
      setSelectionMessage(
        "Usluga je vraćena na izbor jer je potrebno izabrati onu koju terapeut pruža.",
      );
    } else {
      setSelectionMessage(null);
    }
    if (location !== null) {
      const nextLocations = locationsForTherapist(next);
      if (!nextLocations.some((item) => item.value === location)) {
        setLocation(null);
      }
    }
  };

  const changeFormat = (next: BookingFormat) => {
    setFormat(next);
    if (next === "online") setLocation(null);
  };

  const moveTo = (next: Step) => {
    setError(null);
    setStep(next);
  };

  const canContinue =
    step === 1
      ? serviceSlug !== null
      : step === 2
        ? format !== null && (format !== "uzivo" || location !== null)
        : step === 3
          ? Boolean(preferredDate && preferredTime)
          : step === 4
            ? Boolean(
                name.trim() &&
                /.+@.+\..+/.test(email) &&
                (replyPreference !== "phone" || phone.trim()),
              )
            : bookingRulesAccepted;

  const submit = async () => {
    if (
      !selectedService ||
      !format ||
      !preferredDate ||
      !preferredTime ||
      !name.trim() ||
      !/.+@.+\..+/.test(email) ||
      !bookingRulesAccepted
    ) {
      setError("Proverite obavezna polja pre slanja zahteva.");
      return;
    }

    setSending(true);
    setError(null);
    try {
      const response = await fetch("/api/booking-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          therapistSlug,
          serviceSlug: selectedService.slug,
          format,
          location:
            format === "uzivo" && location ? locationLabel(location) : null,
          preferredDate,
          preferredTime,
          alternativeDate: alternativeDate || undefined,
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim() || undefined,
          replyPreference,
          message: message.trim() || undefined,
          bookingRulesAccepted,
          source: context.source ?? undefined,
          website,
          ...(summary ? { summary } : {}),
        }),
      });
      if (!response.ok) throw new Error("send-failed");
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
      <section
        aria-live="polite"
        className="bg-meadow/28 border-sage/20 mx-auto max-w-[960px] rounded-[24px] border p-6 md:p-8"
      >
        <h2 className="text-forest mb-3 font-serif text-[28px] font-normal">
          Vaš zahtev je uspešno poslat
        </h2>
        <p className="text-coffee/75 max-w-[640px] text-[15px] leading-[1.65]">
          Ovo još nije konačna potvrda termina. Terapeut ili član tima proveriće
          dostupnost i poslati potvrdu ili predlog druge mogućnosti na adresu{" "}
          <strong>{email}</strong>.
        </p>
        <dl className="border-coffee/10 mt-6 grid gap-3 border-t pt-5 text-[14px] sm:grid-cols-2">
          <div>
            <dt className="text-coffee/55">Usluga</dt>
            <dd className="text-coffee font-medium">{selectedService?.name}</dd>
          </div>
          <div>
            <dt className="text-coffee/55">Način rada</dt>
            <dd className="text-coffee font-medium">
              {format === "online" ? "Online" : "Uživo"}
              {location ? ` · ${locationLabel(location)}` : ""}
            </dd>
          </div>
        </dl>
        <div className="mt-7 flex flex-wrap gap-3">
          <Link
            href="/"
            className="bg-forest text-canvas hover:bg-forest-hover rounded-full px-6 py-3 text-[14px] font-semibold no-underline transition-colors"
          >
            Nazad na početnu
          </Link>
          <Link
            href="/znanje"
            className="border-coffee/25 text-coffee hover:border-sage rounded-full border px-6 py-3 text-[14px] font-semibold no-underline transition-colors"
          >
            Pogledajte stručne sadržaje
          </Link>
        </div>
      </section>
    );
  }

  if (!started) {
    return (
      <section className="bg-surface border-coffee/8 rounded-3xl border p-6 md:rounded-[32px] md:p-10">
        <h2 className="text-forest mb-2 font-serif text-[28px] leading-[1.15] font-normal">
          Kako želite da počnete?
        </h2>
        <p className="text-coffee/70 mb-8 max-w-[600px] text-[15px] leading-[1.6]">
          Možete zatražiti termin odmah, a izbor usluge ili terapeuta uvek
          možete promeniti pre slanja zahteva.
        </p>
        <div className="flex flex-col gap-4 lg:flex-row">
          <Link
            href="/pronadji-podrsku"
            className="border-coffee/12 hover:border-sage flex min-h-[168px] min-w-0 flex-1 flex-col justify-between rounded-[20px] border p-6 no-underline transition-colors md:p-7"
          >
            <span className="text-forest block font-serif text-xl">
              Nisam siguran/na
            </span>
            <span className="text-coffee/65 mt-2 block text-sm leading-[1.5]">
              Pronađite podršku kroz vođeni izbor.
            </span>
          </Link>
          <button
            type="button"
            onClick={() => setStarted(true)}
            className="border-coffee/12 hover:border-sage flex min-h-[168px] min-w-0 flex-1 cursor-pointer flex-col justify-between rounded-[20px] border bg-transparent p-6 text-left transition-colors md:p-7"
          >
            <span className="text-forest block font-serif text-xl">
              Želim da izaberem uslugu
            </span>
            <span className="text-coffee/65 mt-2 block text-sm leading-[1.5]">
              Pogledajte tri aktivne usluge.
            </span>
          </button>
          <button
            type="button"
            onClick={() => setStarted(true)}
            className="border-coffee/12 hover:border-sage flex min-h-[168px] min-w-0 flex-1 cursor-pointer flex-col justify-between rounded-[20px] border bg-transparent p-6 text-left transition-colors md:p-7"
          >
            <span className="text-forest block font-serif text-xl">
              Želim da izaberem terapeuta
            </span>
            <span className="text-coffee/65 mt-2 block text-sm leading-[1.5]">
              Izaberite osobu koja vam odgovara.
            </span>
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="bg-surface border-coffee/8 mx-auto max-w-[960px] rounded-[24px] border p-5 md:p-8">
      <div className="border-coffee/10 mb-7 flex flex-wrap items-center justify-between gap-3 border-b pb-5">
        <div>
          <p className="text-sage text-[12px] font-semibold tracking-[0.14em] uppercase">
            Zahtev za termin
          </p>
          <h2 className="text-forest mt-1 font-serif text-[26px] font-normal">
            Korak {step} od 5
          </h2>
        </div>
        <p className="text-coffee/62 max-w-[330px] text-right text-[13px] leading-[1.5]">
          Ovo je zahtev za termin. Termin je potvrđen tek kada terapeut ili član
          tima proveri dostupnost i pošalje potvrdu.
        </p>
      </div>

      {context.messages.length > 0 ? (
        <div className="bg-warm/20 text-coffee/80 mb-5 rounded-[16px] px-4 py-3 text-sm leading-[1.55]">
          {context.messages.map((item) => (
            <p key={item}>{item}</p>
          ))}
        </div>
      ) : null}
      {selectionMessage ? (
        <p className="bg-warm/20 text-coffee/80 mb-5 rounded-[16px] px-4 py-3 text-sm leading-[1.55]">
          {selectionMessage}
        </p>
      ) : null}

      {step === 1 ? (
        <div className="grid gap-5 md:grid-cols-2">
          <label className="text-coffee/75 text-[14px] font-medium">
            Usluga
            <select
              value={serviceSlug ?? ""}
              onChange={(event) => changeService(event.target.value)}
              className="border-coffee/15 bg-canvas text-coffee focus:border-sage mt-2 min-h-11 w-full rounded-xl border px-3 text-[15px] outline-none"
            >
              <option value="">Izaberite uslugu</option>
              {serviceOptions.map((service) => (
                <option key={service.slug} value={service.slug}>
                  {service.name} · {formatRsd(service.priceAmount)}
                </option>
              ))}
            </select>
          </label>
          <label className="text-coffee/75 text-[14px] font-medium">
            Terapeut
            <select
              value={therapistSlug ?? ""}
              onChange={(event) => changeTherapist(event.target.value)}
              className="border-coffee/15 bg-canvas text-coffee focus:border-sage mt-2 min-h-11 w-full rounded-xl border px-3 text-[15px] outline-none"
            >
              <option value="">Neka tim predloži</option>
              {therapistOptions.map((therapist) => (
                <option key={therapist.slug} value={therapist.slug}>
                  {therapist.name}
                </option>
              ))}
            </select>
          </label>
          {selectedService ? (
            <p className="text-coffee/62 text-[13px] leading-[1.55] md:col-span-2">
              {selectedService.duration} ·{" "}
              {formatRsd(selectedService.priceAmount)} ·{" "}
              {selectedService.format}
            </p>
          ) : null}
        </div>
      ) : null}

      {step === 2 ? (
        <div>
          <h3 className="text-forest mb-4 font-serif text-[23px] font-normal">
            Kako želite da radite?
          </h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {(
              [
                ["online", "Online"],
                ["uzivo", "Uživo"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                aria-pressed={format === value}
                onClick={() => changeFormat(value)}
                className={`min-h-11 cursor-pointer rounded-[16px] border px-5 py-4 text-left transition-colors ${
                  format === value
                    ? "border-sage bg-meadow/25 text-forest"
                    : "border-coffee/12 bg-canvas text-coffee hover:border-sage"
                }`}
              >
                <span className="font-medium">{label}</span>
              </button>
            ))}
          </div>
          {format === "uzivo" ? (
            <label className="text-coffee/75 mt-5 block text-[14px] font-medium">
              Lokacija
              <select
                value={location ?? ""}
                onChange={(event) =>
                  setLocation(
                    (event.target.value || null) as BookingLocation | null,
                  )
                }
                className="border-coffee/15 bg-canvas text-coffee focus:border-sage mt-2 min-h-11 w-full rounded-xl border px-3 text-[15px] outline-none"
              >
                <option value="">Izaberite lokaciju</option>
                {locationOptions.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
              {selectedTherapist ? (
                <span className="text-coffee/55 mt-2 block text-[13px] font-normal">
                  {selectedTherapist.firstName} radi uživo u{" "}
                  {selectedTherapist.cityLocative}.
                </span>
              ) : null}
            </label>
          ) : null}
        </div>
      ) : null}

      {step === 3 ? (
        <div className="grid gap-5 md:grid-cols-2">
          <label className="text-coffee/75 text-[14px] font-medium">
            Željeni datum
            <input
              type="date"
              value={preferredDate}
              onChange={(event) => setPreferredDate(event.target.value)}
              className="border-coffee/15 bg-canvas text-coffee focus:border-sage mt-2 min-h-11 w-full rounded-xl border px-3 text-[15px] outline-none"
            />
          </label>
          <label className="text-coffee/75 text-[14px] font-medium">
            Period dana
            <select
              value={preferredTime}
              onChange={(event) => setPreferredTime(event.target.value)}
              className="border-coffee/15 bg-canvas text-coffee focus:border-sage mt-2 min-h-11 w-full rounded-xl border px-3 text-[15px] outline-none"
            >
              <option value="">Izaberite period</option>
              {timeOfDayOptions.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
          <label className="text-coffee/75 text-[14px] font-medium md:col-span-2">
            Alternativni datum <span className="text-coffee/45">(opciono)</span>
            <input
              type="date"
              value={alternativeDate}
              onChange={(event) => setAlternativeDate(event.target.value)}
              className="border-coffee/15 bg-canvas text-coffee focus:border-sage mt-2 min-h-11 w-full rounded-xl border px-3 text-[15px] outline-none"
            />
          </label>
        </div>
      ) : null}

      {step === 4 ? (
        <div className="grid gap-5 md:grid-cols-2">
          <label className="text-coffee/75 text-[14px] font-medium">
            Ime i prezime
            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              autoComplete="name"
              className="border-coffee/15 bg-canvas text-coffee focus:border-sage mt-2 min-h-11 w-full rounded-xl border px-3 text-[15px] outline-none"
            />
          </label>
          <label className="text-coffee/75 text-[14px] font-medium">
            Email
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              className="border-coffee/15 bg-canvas text-coffee focus:border-sage mt-2 min-h-11 w-full rounded-xl border px-3 text-[15px] outline-none"
            />
          </label>
          <label className="text-coffee/75 text-[14px] font-medium">
            Telefon <span className="text-coffee/45">(opciono)</span>
            <input
              type="tel"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              autoComplete="tel"
              className="border-coffee/15 bg-canvas text-coffee focus:border-sage mt-2 min-h-11 w-full rounded-xl border px-3 text-[15px] outline-none"
            />
          </label>
          <label className="text-coffee/75 text-[14px] font-medium">
            Želim odgovor putem
            <select
              value={replyPreference}
              onChange={(event) =>
                setReplyPreference(event.target.value as "email" | "phone")
              }
              className="border-coffee/15 bg-canvas text-coffee focus:border-sage mt-2 min-h-11 w-full rounded-xl border px-3 text-[15px] outline-none"
            >
              <option value="email">Emaila</option>
              <option value="phone">Telefona</option>
            </select>
          </label>
          <label className="text-coffee/75 text-[14px] font-medium md:col-span-2">
            Kratka poruka <span className="text-coffee/45">(opciono)</span>
            <textarea
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              rows={4}
              className="border-coffee/15 bg-canvas text-coffee focus:border-sage mt-2 w-full resize-y rounded-xl border px-3 py-2.5 text-[15px] outline-none"
            />
          </label>
          <label className="sr-only" aria-hidden="true">
            Website
            <input
              value={website}
              onChange={(event) => setWebsite(event.target.value)}
              tabIndex={-1}
              autoComplete="off"
            />
          </label>
        </div>
      ) : null}

      {step === 5 ? (
        <div>
          <h3 className="text-forest mb-4 font-serif text-[23px] font-normal">
            Pregled zahteva
          </h3>
          <dl className="bg-canvas grid gap-4 rounded-[18px] p-5 text-[14px] md:grid-cols-2">
            <div>
              <dt className="text-coffee/55">Usluga</dt>
              <dd className="text-coffee font-medium">
                {selectedService?.name}
              </dd>
            </div>
            <div>
              <dt className="text-coffee/55">Terapeut</dt>
              <dd className="text-coffee font-medium">
                {selectedTherapist?.name ?? "Neka tim predloži"}
              </dd>
            </div>
            <div>
              <dt className="text-coffee/55">Način rada</dt>
              <dd className="text-coffee font-medium">
                {format === "online" ? "Online" : "Uživo"}
                {location ? ` · ${locationLabel(location)}` : ""}
              </dd>
            </div>
            <div>
              <dt className="text-coffee/55">Željeni termin</dt>
              <dd className="text-coffee font-medium">
                {preferredDate} · {preferredTime}
              </dd>
            </div>
            <div>
              <dt className="text-coffee/55">Kontakt</dt>
              <dd className="text-coffee font-medium">{email}</dd>
            </div>
          </dl>
          <label className="text-coffee/75 mt-5 flex cursor-pointer items-start gap-3 text-[14px] leading-[1.55]">
            <input
              type="checkbox"
              checked={bookingRulesAccepted}
              onChange={(event) =>
                setBookingRulesAccepted(event.target.checked)
              }
              className="accent-forest mt-0.5 h-4 w-4 shrink-0"
            />
            <span>
              Razumem da je ovo zahtev za termin i da termin postaje potvrđen
              tek nakon provere dostupnosti.
            </span>
          </label>
          <p className="text-coffee/60 mt-4 text-[13px] leading-[1.55]">
            Ovo je zahtev za termin, ne konačna potvrda. Dostupnost proverava
            terapeut ili član tima nakon prijema zahteva.
          </p>
        </div>
      ) : null}

      {error ? (
        <p className="text-danger mt-5 text-sm" role="alert">
          {error}
        </p>
      ) : null}

      <div className="border-coffee/10 mt-7 flex flex-wrap justify-between gap-3 border-t pt-5">
        {step > 1 ? (
          <button
            type="button"
            onClick={() => moveTo((step - 1) as Step)}
            className="text-coffee hover:text-forest min-h-11 cursor-pointer border-0 bg-transparent px-3 text-[14px] font-semibold"
          >
            Nazad
          </button>
        ) : (
          <span />
        )}
        {step < 5 ? (
          <button
            type="button"
            disabled={!canContinue}
            onClick={() => moveTo((step + 1) as Step)}
            className="bg-forest text-canvas hover:bg-forest-hover min-h-11 cursor-pointer rounded-full border-0 px-6 text-[14px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50"
          >
            Nastavi
          </button>
        ) : (
          <button
            type="button"
            disabled={!canContinue || sending}
            onClick={submit}
            className="bg-forest text-canvas hover:bg-forest-hover min-h-11 cursor-pointer rounded-full border-0 px-6 text-[14px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50"
          >
            {sending ? "Šaljemo..." : "Pošaljite zahtev"}
          </button>
        )}
      </div>
    </section>
  );
}
