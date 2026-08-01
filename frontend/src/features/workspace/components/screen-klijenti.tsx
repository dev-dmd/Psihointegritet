"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { StatusBadge } from "@/components/panel/status-badge";
import { TabPills } from "@/components/panel/tab-pills";
import { Chip } from "@/components/ui/chip";
import { findService } from "@/content/services";
import { findTherapist } from "@/content/therapists";
import { intakeFeatureFlags } from "@/features/guidance/intake-feature-flags";

import { clients, unassignedRequests } from "../data";
import {
  claimIntakeCase,
  fetchIntakeTeamQueue,
  type IntakeTeamQueueItem,
} from "../intake-team-queue-api";
import { STATUS_META } from "../types";
import { useWorkspace } from "../workspace-context";
import { PageHeader } from "./page-header";

export function ScreenKlijenti() {
  const [tab, setTab] = useState("svi");
  const { isTherapist, selectedTherapistSlug } = useWorkspace();
  const teamQueueEnabled = intakeFeatureFlags.teamQueueEnabled;
  const queryClient = useQueryClient();
  const teamQueueQuery = useQuery({
    queryKey: ["intake-team-queue"],
    queryFn: fetchIntakeTeamQueue,
    enabled: teamQueueEnabled,
  });
  const claimMutation = useMutation({
    mutationFn: claimIntakeCase,
    onSuccess: (_, caseId) => {
      queryClient.setQueryData<IntakeTeamQueueItem[]>(
        ["intake-team-queue"],
        (current) => current?.filter((item) => item.caseId !== caseId) ?? [],
      );
      toast.success("Zahtev je preuzet.");
    },
    onError: () => {
      toast.error(
        "Zahtev je u međuvremenu preuzet ili trenutno nije dostupan.",
      );
      void queryClient.invalidateQueries({ queryKey: ["intake-team-queue"] });
    },
  });
  const teamQueue = teamQueueQuery.data ?? [];
  const queueState = teamQueueQuery.isLoading
    ? "loading"
    : teamQueueQuery.isError
      ? "error"
      : "idle";
  const claimingCaseId = claimMutation.isPending
    ? (claimMutation.variables ?? null)
    : null;

  const shownClients = selectedTherapistSlug
    ? clients.filter((c) => c.therapistSlug === selectedTherapistSlug)
    : clients;

  const tabs = [
    { id: "svi", label: "Svi" },
    {
      id: "nedodeljeni",
      label: `Nedodeljeni · ${teamQueueEnabled ? teamQueue.length : unassignedRequests.length}`,
    },
  ];

  return (
    <section className="animate-fade-up">
      <PageHeader
        title="Klijenti"
        description="Aktivan rad, dodele i Intake zahtevi bez terapeuta."
      />
      <TabPills tabs={tabs} activeId={tab} onChange={setTab} className="mb-5" />

      {tab === "svi" ? (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {shownClients.map((client) => {
            const meta = STATUS_META[client.status];
            return (
              <div
                key={client.id}
                className="rounded-card border-line bg-surface border px-5 py-[18px]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3.5">
                    <span className="bg-meadow/35 text-forest inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[13px] font-semibold">
                      {client.initials}
                    </span>
                    <div>
                      <div className="text-coffee text-[15px] font-semibold">
                        {client.name}
                      </div>
                      <div className="text-ink-55 text-[12.5px]">
                        {client.therapist}
                      </div>
                    </div>
                  </div>
                  <StatusBadge tone={meta.tone}>{meta.label}</StatusBadge>
                </div>
                <div className="border-line text-ink-55 mt-3.5 flex flex-wrap gap-x-4 gap-y-1 border-t pt-3 text-[12.5px]">
                  <span>Sledeći: {client.next}</span>
                  <span>
                    {client.format} · {client.service}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      ) : null}

      {tab === "nedodeljeni" ? (
        teamQueueEnabled ? (
          <ProductionIntakeQueue
            queue={teamQueue}
            state={queueState}
            isTherapist={isTherapist}
            claimingCaseId={claimingCaseId}
            onClaim={claimMutation.mutate}
          />
        ) : (
          <DemoIntakeQueue />
        )
      ) : null}
    </section>
  );
}

function ProductionIntakeQueue({
  queue,
  state,
  isTherapist,
  claimingCaseId,
  onClaim,
}: {
  queue: IntakeTeamQueueItem[];
  state: "idle" | "loading" | "error";
  isTherapist: boolean;
  claimingCaseId: string | null;
  onClaim: (caseId: string) => void;
}) {
  if (state === "loading") {
    return <p className="text-ink-55 text-[14px]">Učitavanje zahteva...</p>;
  }
  if (state === "error") {
    return (
      <p className="text-danger text-[14px]" role="alert">
        Nedodeljeni zahtevi trenutno nisu dostupni.
      </p>
    );
  }
  if (queue.length === 0) {
    return (
      <p className="text-ink-55 text-[14px]">Nema nedodeljenih zahteva.</p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {queue.map((request) => {
        const service = request.serviceSlug
          ? findService(request.serviceSlug)
          : undefined;
        const recommendations = request.recommendedTherapistSlugs
          .map((slug) => findTherapist(slug)?.name)
          .filter((name): name is string => Boolean(name));
        const preferredTherapist = request.preferredTherapistSlug
          ? findTherapist(request.preferredTherapistSlug)
          : undefined;
        return (
          <div
            key={request.caseId}
            className="rounded-card border-line bg-surface border px-6 py-5"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="text-coffee text-[15px] font-semibold">
                  Intake zahtev · {formatQueueDate(request.createdAt)}
                </div>
                <div className="text-ink-55 mt-1 text-[12.5px]">
                  {request.format ?? "Format nije naveden"} · uzrast{" "}
                  {formatSubjectAgeBand(request.subjectAgeBand)} · podnosilac{" "}
                  {formatRequesterRole(request.requesterRole)}
                </div>
              </div>
              <StatusBadge tone="wait">Nedodeljen</StatusBadge>
            </div>
            <div className="mt-3.5 flex flex-wrap gap-2">
              {service ? (
                <Chip variant="tagOutlined" className="text-[12.5px]">
                  {service.name}
                </Chip>
              ) : null}
              {preferredTherapist ? (
                <Chip variant="tagOutlined" className="text-[12.5px]">
                  Izbor korisnika: {preferredTherapist.name}
                </Chip>
              ) : null}
              {request.requiresHumanReview ? (
                <Chip variant="tagOutlined" className="text-[12.5px]">
                  Pregled tima
                </Chip>
              ) : null}
              {request.reviewPriority === "priority" ? (
                <Chip variant="tagOutlined" className="text-[12.5px]">
                  Prioritetni pregled
                </Chip>
              ) : null}
              {request.hasFreeText ? (
                <Chip variant="tagOutlined" className="text-[12.5px]">
                  Dodatna poruka postoji
                </Chip>
              ) : null}
            </div>
            <div className="text-ink-55 mt-3 text-[13px]">
              <span className="font-semibold">Preporuka:</span>{" "}
              {recommendations.length > 0
                ? recommendations.join(" · ")
                : "Tim određuje sledeći korak"}
            </div>
            {isTherapist ? (
              <div className="mt-4">
                <button
                  type="button"
                  disabled={claimingCaseId === request.caseId}
                  onClick={() => onClaim(request.caseId)}
                  className="bg-forest text-canvas hover:bg-forest-hover disabled:bg-forest/45 cursor-pointer rounded-full border-0 px-5 py-2.5 text-[13px] font-semibold transition-colors disabled:cursor-not-allowed"
                >
                  {claimingCaseId === request.caseId
                    ? "Preuzimanje..."
                    : "Preuzmi"}
                </button>
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function DemoIntakeQueue() {
  return (
    <div className="flex flex-col gap-3">
      <div className="bg-meadow/22 border-sage/30 text-coffee rounded-tile border px-5 py-3.5 text-[13px] leading-[1.5]">
        Deo Intake &amp; Matching engine-a — zahtevi kojima sistem nije
        automatski dodelio terapeuta. Kada terapeut preuzme klijenta, ostalima
        je vidljivo samo ko ga je preuzeo.
      </div>
      {unassignedRequests.map((request) => (
        <div
          key={request.id}
          className="rounded-card border-line bg-surface border px-6 py-5"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-center gap-3.5">
              <span className="bg-warm/30 text-coffee inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[13px] font-semibold">
                {request.initials}
              </span>
              <div>
                <div className="text-coffee text-[15px] font-semibold">
                  Intake zahtev · {request.date}
                </div>
                <div className="text-ink-55 text-[12.5px]">
                  {request.ago} · {request.format} · uzrast {request.ageGroup}
                </div>
              </div>
            </div>
            <StatusBadge tone="wait">Nedodeljen</StatusBadge>
          </div>
          <div className="mt-3.5 flex flex-wrap gap-2">
            {request.areas.map((area) => (
              <Chip key={area} variant="tagOutlined" className="text-[12.5px]">
                {area}
              </Chip>
            ))}
          </div>
          <div className="text-ink-55 mt-3 text-[13px]">
            <span className="font-semibold">Preporuka:</span>{" "}
            {request.recommended} — {request.reason}
          </div>
          <div className="mt-4 flex flex-wrap gap-2.5">
            <button
              type="button"
              onClick={() =>
                toast.success(
                  "Preuzeto — ostalima je vidljivo samo ko je preuzeo.",
                )
              }
              className="bg-forest text-canvas hover:bg-forest-hover cursor-pointer rounded-full border-0 px-5 py-2.5 text-[13px] font-semibold transition-colors"
            >
              Preuzmi
            </button>
            <button
              type="button"
              onClick={() =>
                toast("Dodela terapeutu stiže sa Booking engine-om.")
              }
              className="border-coffee/22 text-coffee hover:border-sage cursor-pointer rounded-full border-[1.5px] bg-transparent px-5 py-2.5 text-[13px] font-semibold transition-colors"
            >
              Dodeli terapeutu
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function formatQueueDate(value: string): string {
  return new Intl.DateTimeFormat("sr-RS", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatSubjectAgeBand(value: string): string {
  const labels: Record<string, string> = {
    under_12: "mlađe od 12",
    "12_15": "12–15",
    "16_17": "16–17",
    adult: "18+",
  };
  return labels[value] ?? "nije navedeno";
}

function formatRequesterRole(value: string): string {
  const labels: Record<string, string> = {
    self_adult: "punoletna osoba",
    guardian: "roditelj/staratelj",
    adolescent_16_17: "adolescent",
    information_only: "informativni put",
  };
  return labels[value] ?? "nije navedeno";
}
