import { ConfirmModal } from "psihointegritet-ds";

// Superadmin gate-toggle confirmation (handoff component #19), copy ported
// verbatim from features/superadmin/components/gates-table.tsx: a toggle
// never flips directly — it opens this modal demanding a reason before the
// change is written to the activity feed / Audit Log.
export function GateToggleConfirm() {
  return (
    <ConfirmModal
      open={true}
      eyebrow="Potvrda promene"
      title="Company Programs"
      description="Tenant Psihointegritet · Uključeno → Isključeno"
      reasonLabel="Razlog promene — obavezno"
      reasonPlaceholder="npr. Dogovor sa vlasnicom centra"
      note="Promena se upisuje u Audit Log: ko, kada, prethodna i nova vrednost, razlog."
      confirmLabel="Potvrdi promenu"
      onConfirm={() => {}}
      onClose={() => {}}
    />
  );
}
