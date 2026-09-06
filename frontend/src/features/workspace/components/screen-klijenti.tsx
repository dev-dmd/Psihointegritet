"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useFormatter, useTranslations } from "next-intl";

import { StatusBadge } from "@/components/panel/status-badge";
import { TabPills } from "@/components/panel/tab-pills";
import { Chip } from "@/components/ui/chip";
import { useFallbackContent } from "@/content/use-content";
import { intakeFeatureFlags } from "@/features/guidance/intake-feature-flags";

import {
  useClaimIntakeCaseMutation,
  useIntakeTeamQueueQuery,
} from "../hooks/use-intake-team-queue";
import type { IntakeTeamQueueItem } from "../intake-team-queue-api";
import { STATUS_META, type UnassignedRequest } from "../types";
import { useStatusLabel } from "../use-status-label";
import { useWorkspace } from "../workspace-context";
import { PageHeader } from "./page-header";
import { WorkspaceDataNotice } from "./workspace-data-notice";

export function ScreenKlijenti() {
  const t = useTranslations("screens.clients");
  const fallback = useFallbackContent();
  const { clients, unassignedRequests } = fallback.workspaceDemo;
  const statusLabel = useStatusLabel();
  const [tab, setTab] = useState("svi");
  const { isTherapist, selectedTherapistSlug } = useWorkspace();
  const teamQueueEnabled = intakeFeatureFlags.teamQueueEnabled;
  const teamQueueQuery = useIntakeTeamQueueQuery(teamQueueEnabled);
  const claimMutation = useClaimIntakeCaseMutation();
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
    { id: "svi", label: t("tabs.all") },
    {
      id: "nedodeljeni",
      label: t("tabs.unassigned", {
        count: teamQueueEnabled ? teamQueue.length : unassignedRequests.length,
      }),
    },
  ];

  return (
    <section className="animate-fade-up">
      <PageHeader title={t("title")} description={t("description")} />
      <WorkspaceDataNotice />
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
                  <StatusBadge tone={meta.tone}>
                    {statusLabel(client.status)}
                  </StatusBadge>
                </div>
                <div className="border-line text-ink-55 mt-3.5 flex flex-wrap gap-x-4 gap-y-1 border-t pt-3 text-[12.5px]">
                  <span>{t("next", { value: client.next })}</span>
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
            serviceCatalog={fallback.services.serviceCatalog}
            therapists={fallback.therapists}
            queue={teamQueue}
            state={queueState}
            isTherapist={isTherapist}
            claimingCaseId={claimingCaseId}
            onClaim={claimMutation.mutate}
          />
        ) : (
          <DemoIntakeQueue requests={unassignedRequests} />
        )
      ) : null}
    </section>
  );
}

function ProductionIntakeQueue({
  serviceCatalog,
  therapists,
  queue,
  state,
  isTherapist,
  claimingCaseId,
  onClaim,
}: {
  serviceCatalog: ReturnType<
    typeof useFallbackContent
  >["services"]["serviceCatalog"];
  therapists: ReturnType<typeof useFallbackContent>["therapists"];
  queue: IntakeTeamQueueItem[];
  state: "idle" | "loading" | "error";
  isTherapist: boolean;
  claimingCaseId: string | null;
  onClaim: (caseId: string) => void;
}) {
  const t = useTranslations("screens.clients");
  const format = useFormatter();
  if (state === "loading") {
    return <p className="text-ink-55 text-[14px]">{t("loading")}</p>;
  }
  if (state === "error") {
    return (
      <p className="text-danger text-[14px]" role="alert">
        {t("unavailable")}
      </p>
    );
  }
  if (queue.length === 0) {
    return <p className="text-ink-55 text-[14px]">{t("empty")}</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      {queue.map((request) => {
        const service = request.serviceSlug
          ? serviceCatalog.find((item) => item.slug === request.serviceSlug)
          : undefined;
        const recommendations = request.recommendedTherapistSlugs
          .map((slug) => therapists.find((item) => item.slug === slug)?.name)
          .filter((name): name is string => Boolean(name));
        const preferredTherapist = request.preferredTherapistSlug
          ? therapists.find(
              (item) => item.slug === request.preferredTherapistSlug,
            )
          : undefined;
        return (
          <div
            key={request.caseId}
            className="rounded-card border-line bg-surface border px-6 py-5"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="text-coffee text-[15px] font-semibold">
                  {t("intakeRequest", {
                    date: format.dateTime(new Date(request.createdAt), {
                      day: "2-digit",
                      month: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    }),
                  })}
                </div>
                <div className="text-ink-55 mt-1 text-[12.5px]">
                  {t("requestDetails", {
                    format: request.format ?? t("formatMissing"),
                    age: ageBandLabel(t, request.subjectAgeBand),
                    requester: requesterRoleLabel(t, request.requesterRole),
                  })}
                </div>
              </div>
              <StatusBadge tone="wait">{t("unassigned")}</StatusBadge>
            </div>
            <div className="mt-3.5 flex flex-wrap gap-2">
              {service ? (
                <Chip variant="tagOutlined" className="text-[12.5px]">
                  {service.name}
                </Chip>
              ) : null}
              {preferredTherapist ? (
                <Chip variant="tagOutlined" className="text-[12.5px]">
                  {t("userChoice", { name: preferredTherapist.name })}
                </Chip>
              ) : null}
              {request.requiresHumanReview ? (
                <Chip variant="tagOutlined" className="text-[12.5px]">
                  {t("teamReview")}
                </Chip>
              ) : null}
              {request.reviewPriority === "priority" ? (
                <Chip variant="tagOutlined" className="text-[12.5px]">
                  {t("priorityReview")}
                </Chip>
              ) : null}
              {request.hasFreeText ? (
                <Chip variant="tagOutlined" className="text-[12.5px]">
                  {t("extraMessage")}
                </Chip>
              ) : null}
            </div>
            <div className="text-ink-55 mt-3 text-[13px]">
              <span className="font-semibold">{t("recommendation")}</span>{" "}
              {recommendations.length > 0
                ? recommendations.join(" · ")
                : t("teamDecides")}
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
                    ? t("claiming")
                    : t("claim")}
                </button>
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function DemoIntakeQueue({
  requests,
}: {
  requests: readonly UnassignedRequest[];
}) {
  const t = useTranslations("screens.clients");
  return (
    <div className="flex flex-col gap-3">
      <div className="bg-meadow/22 border-sage/30 text-coffee rounded-tile border px-5 py-3.5 text-[13px] leading-[1.5]">
        {t("demoNotice")}
      </div>
      {requests.map((request) => (
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
                  {t("intakeRequest", { date: request.date })}
                </div>
                <div className="text-ink-55 text-[12.5px]">
                  {request.ago} · {request.format} ·{" "}
                  {t("age", { value: request.ageGroup })}
                </div>
              </div>
            </div>
            <StatusBadge tone="wait">{t("unassigned")}</StatusBadge>
          </div>
          <div className="mt-3.5 flex flex-wrap gap-2">
            {request.areas.map((area) => (
              <Chip key={area} variant="tagOutlined" className="text-[12.5px]">
                {area}
              </Chip>
            ))}
          </div>
          <div className="text-ink-55 mt-3 text-[13px]">
            <span className="font-semibold">{t("recommendation")}</span>{" "}
            {request.recommended} — {request.reason}
          </div>
          <div className="mt-4 flex flex-wrap gap-2.5">
            <button
              type="button"
              onClick={() => toast.success(t("claimedToast"))}
              className="bg-forest text-canvas hover:bg-forest-hover cursor-pointer rounded-full border-0 px-5 py-2.5 text-[13px] font-semibold transition-colors"
            >
              {t("claim")}
            </button>
            <button
              type="button"
              onClick={() => toast(t("assignSoon"))}
              className="border-coffee/22 text-coffee hover:border-sage cursor-pointer rounded-full border-[1.5px] bg-transparent px-5 py-2.5 text-[13px] font-semibold transition-colors"
            >
              {t("assign")}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function ageBandLabel(
  t: ReturnType<typeof useTranslations<"screens.clients">>,
  value: string,
): string {
  const keys = {
    under_12: "under12",
    "12_15": "from12To15",
    "16_17": "from16To17",
    adult: "adult",
  } as const;
  const key = keys[value as keyof typeof keys];
  return key ? t(`ageBands.${key}`) : t("unknown");
}

function requesterRoleLabel(
  t: ReturnType<typeof useTranslations<"screens.clients">>,
  value: string,
): string {
  const keys = {
    self_adult: "selfAdult",
    guardian: "guardian",
    adolescent_16_17: "adolescent",
    information_only: "informationOnly",
  } as const;
  const key = keys[value as keyof typeof keys];
  return key ? t(`requesterRoles.${key}`) : t("unknown");
}
