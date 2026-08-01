"use client";

import { useState } from "react";

import { cn } from "@/helpers/cn";

import {
  firstTaxonomyError,
  useConfirmTaxonomyRouteMutation,
  useSuggestTaxonomyRouteMutation,
} from "../../hooks/use-taxonomy-registry";
import {
  suggestTaxonomyRoute,
  taxonomyFieldErrors,
  type TaxonomyRoute,
  type TaxonomyRouteSuggestion,
  type TaxonomyTerm,
} from "../../taxonomy-api";
import { ROUTE_SLUG_PATTERN } from "./constants";
import { FieldError, GovernanceError } from "./governance-error";

/** K2.10 — propose and confirm the public slug before first publish. Changing
 * the label never changes the path; correcting the path keeps the old one as a
 * redirect, which the backend writes. */
export function RouteGovernanceControls({
  term,
  onConfirmed,
}: {
  term: TaxonomyTerm;
  onConfirmed: (route: TaxonomyRoute) => void;
}) {
  const [suggestion, setSuggestion] = useState<TaxonomyRouteSuggestion | null>(
    term.canonicalPath
      ? {
          slug: term.canonicalPath.split("/").pop() ?? "",
          canonicalPath: term.canonicalPath,
          available: true,
        }
      : null,
  );
  const [slug, setSlug] = useState(suggestion?.slug ?? "");
  const hasCanonicalRoute = Boolean(term.canonicalPath);

  const suggestMutation = useSuggestTaxonomyRouteMutation(
    term.termId,
    (next) => {
      setSuggestion(next);
      setSlug(next.slug);
    },
  );
  const confirmMutation = useConfirmTaxonomyRouteMutation(
    term.termId,
    (route) => {
      setSuggestion({
        slug: route.slug,
        canonicalPath: route.canonicalPath,
        available: true,
        currentRouteId: route.routeId,
        currentLockVersion: route.lockVersion,
      });
      setSlug(route.slug);
      onConfirmed(route);
    },
  );

  const submitSlug = async () => {
    const normalizedSlug = slug.trim();
    // Shape is checked before the request, not by sending a known-bad payload;
    // the message rendered for it is the same `fieldError` slot the server's
    // own 422 uses, so the two are indistinguishable to the user.
    if (!ROUTE_SLUG_PATTERN.test(normalizedSlug)) return;
    // The list read-model deliberately exposes only the canonical path, not
    // the route lock. Fetch it only when correcting an existing path.
    const current =
      hasCanonicalRoute && suggestion?.currentLockVersion == null
        ? await suggestTaxonomyRoute(term.termId)
        : suggestion;
    confirmMutation.mutate({
      slug: normalizedSlug,
      lockVersion: current?.currentLockVersion ?? null,
    });
  };

  const routeError = firstTaxonomyError([
    {
      isError: suggestMutation.isError,
      error: suggestMutation.error,
      fallback: "Predlog javne putanje nije dostupan. Pokušajte ponovo.",
    },
    {
      isError: confirmMutation.isError,
      error: confirmMutation.error,
      fallback: "Javna putanja nije sačuvana. Pokušajte ponovo.",
    },
  ]);
  const invalidLocally =
    slug.trim().length > 0 && !ROUTE_SLUG_PATTERN.test(slug.trim());
  const fieldError = invalidLocally
    ? "Javna putanja koristi mala slova, brojeve i crtice, na primer stres-i-preopterecenost."
    : taxonomyFieldErrors(confirmMutation.error).slug;
  const globalError = fieldError ? null : routeError;
  const busy = suggestMutation.isPending || confirmMutation.isPending;

  return (
    <section className="border-line rounded-tile mt-4 border px-3.5 py-3.5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h4 className="text-ink-70 text-[12.5px] font-semibold">
            Javna putanja
          </h4>
          <p className="text-ink-55 mt-1 max-w-[620px] text-[12px] leading-[1.45]">
            {hasCanonicalRoute
              ? "Promena javnog naziva ne menja ovu putanju. Ako je namerno promenite, stara putanja ostaje bezbedan redirect."
              : "Pre objave potvrdite putanju koju će ljudi i pretraživači koristiti. Javna stranica postaje dostupna tek kada termin bude objavljen."}
          </p>
        </div>
        <span
          className={cn(
            "rounded-full px-2.5 py-1 text-[11px] font-semibold",
            hasCanonicalRoute
              ? "bg-badge-ok-bg text-badge-ok"
              : "bg-badge-amber-bg text-badge-amber",
          )}
        >
          {hasCanonicalRoute ? "Putanja potvrđena" : "Potvrda potrebna"}
        </span>
      </div>

      {!suggestion ? (
        <button
          type="button"
          disabled={busy}
          onClick={() => suggestMutation.mutate()}
          className="border-line-strong text-ink-70 hover:border-coffee/40 mt-3 cursor-pointer rounded-full border bg-transparent px-3.5 py-2 text-[12px] font-semibold disabled:cursor-not-allowed disabled:opacity-60"
        >
          {suggestMutation.isPending
            ? "Priprema predloga…"
            : "Predloži javnu putanju"}
        </button>
      ) : (
        <div className="mt-3">
          <label
            htmlFor={`kompas-route-${term.termId}`}
            className="text-ink-70 mb-1.5 block text-[12px] font-semibold"
          >
            Slug putanje
          </label>
          <div className="flex flex-wrap items-start gap-2">
            <span className="border-line-strong bg-panel-canvas text-ink-45 rounded-tile border px-3 py-2 font-mono text-[12px]">
              /kompas/{term.axis === "topic_group" ? "oblast" : "tema"}/
            </span>
            <input
              id={`kompas-route-${term.termId}`}
              value={slug}
              maxLength={160}
              disabled={busy}
              onChange={(event) => {
                setSlug(event.target.value);
                confirmMutation.reset();
              }}
              aria-invalid={Boolean(fieldError)}
              aria-describedby={
                fieldError ? `kompas-route-${term.termId}-error` : undefined
              }
              className={cn(
                "border-line-strong rounded-tile bg-panel-canvas text-coffee focus:border-sage min-w-[220px] flex-1 border px-3 py-2 font-mono text-[12px] outline-none disabled:opacity-60",
                fieldError ? "border-danger focus:border-danger" : "",
              )}
            />
            <button
              type="button"
              disabled={busy || !slug.trim() || invalidLocally}
              onClick={() => void submitSlug()}
              className="bg-forest text-panel-canvas hover:bg-forest-hover cursor-pointer rounded-full border-0 px-3.5 py-2 text-[12px] font-semibold disabled:cursor-not-allowed disabled:opacity-60"
            >
              {confirmMutation.isPending
                ? "Čuvanje…"
                : hasCanonicalRoute
                  ? "Sačuvaj korekciju"
                  : "Potvrdi putanju"}
            </button>
          </div>
          <FieldError
            id={`kompas-route-${term.termId}-error`}
            message={fieldError}
          />
          <p className="text-ink-45 mt-2 text-[11.5px]">
            Preview:{" "}
            <span className="font-mono">
              {suggestion.canonicalPath.replace(/[^/]+$/, slug.trim() || "…")}
            </span>
          </p>
        </div>
      )}
      <GovernanceError error={globalError} />
    </section>
  );
}
