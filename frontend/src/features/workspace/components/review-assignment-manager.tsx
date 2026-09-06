"use client";

import { useState } from "react";

import type { ApprovalCapability } from "@/lib/content-governance/types";
import { useUserSafeError } from "@/lib/errors/use-user-safe-error";

import {
  useCreateReviewAssignmentMutation,
  useReviewAssignmentsQuery,
  useStaffUsersQuery,
} from "../hooks/use-review-assignments";

const CAP_LABELS: Record<ApprovalCapability, string> = {
  clinical: "Stručni pregled",
  business: "Poslovni pregled",
  legal: "Pravni pregled",
};

/** Inline ability management inside the article editor (RW-6). */
export function ReviewAssignmentManager() {
  const safeError = useUserSafeError();
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedCap, setSelectedCap] =
    useState<ApprovalCapability>("clinical");

  const { data: users } = useStaffUsersQuery();
  const { data: assignments } = useReviewAssignmentsQuery();

  const assignMutation = useCreateReviewAssignmentMutation({
    onAssigned: () => setSelectedUserId(""),
  });

  const handleAssign = () => {
    if (!selectedUserId) return;
    assignMutation.mutate({
      userId: selectedUserId,
      capability: selectedCap,
      active: true,
    });
  };

  const selectedUser = users?.find((u) => u.userId === selectedUserId);

  return (
    <div className="rounded-panel border-line border px-5 py-4">
      <h3 className="text-coffee text-[13px] font-semibold">
        Ko dobija mejlove za pregled
      </h3>
      <p className="text-ink-55 mt-1 text-[11.5px] leading-[1.55]">
        Izaberite člana tima i vrstu pregleda za koju će dobijati obaveštenja.
      </p>

      {/* Current assignments — chips */}
      {assignments && assignments.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {assignments.map((a) => (
            <span
              key={a.assignmentId}
              className="bg-badge-ok-bg text-badge-ok inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px]"
            >
              {a.displayName} · {CAP_LABELS[a.capability]}
            </span>
          ))}
        </div>
      ) : (
        <p className="text-ink-45 mt-2 text-[11px] italic">
          Još niko nije dodeljen. Mejlovi idu na superadmin adresu.
        </p>
      )}

      {/* Add form — dropdown */}
      <div className="mt-3 flex flex-wrap items-end gap-2">
        <div className="flex flex-col gap-0.5">
          <label className="text-ink-55 text-[10px]">Član tima</label>
          <select
            value={selectedUserId}
            onChange={(e) => setSelectedUserId(e.target.value)}
            className="border-line-strong min-w-[180px] rounded-lg border px-2.5 py-2 text-[12.5px]"
          >
            <option value="">Izaberite člana…</option>
            {(users ?? []).map((u) => (
              <option key={u.userId} value={u.userId}>
                {u.displayName} ({u.email})
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-0.5">
          <label className="text-ink-55 text-[10px]">Vrsta pregleda</label>
          <select
            value={selectedCap}
            onChange={(e) =>
              setSelectedCap(e.target.value as ApprovalCapability)
            }
            className="border-line-strong rounded-lg border px-2.5 py-2 text-[12.5px]"
          >
            <option value="clinical">Stručni pregled</option>
            <option value="business">Poslovni pregled</option>
          </select>
        </div>
        <button
          type="button"
          onClick={handleAssign}
          disabled={!selectedUserId || assignMutation.isPending}
          className="border-forest bg-forest text-panel-canvas min-h-[36px] cursor-pointer rounded-full border px-4 text-[11px] font-semibold transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {assignMutation.isPending ? "…" : "Dodeli"}
        </button>
      </div>

      {selectedUser ? (
        <p className="text-ink-45 mt-1.5 text-[10.5px]">
          {selectedUser.displayName} će dobijati mejlove za{" "}
          {CAP_LABELS[selectedCap].toLowerCase()} kad neko pošalje tekst na
          pregled.
        </p>
      ) : null}

      {assignMutation.isError ? (
        <p className="text-danger mt-1.5 text-[11px]">
          {safeError.text(assignMutation.error, "content", "change")}
        </p>
      ) : null}
    </div>
  );
}
