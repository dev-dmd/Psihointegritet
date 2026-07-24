import { StatusBadge } from "psihointegritet-ds";

// Real tone/label pairs pulled from workspace/types.ts (STATUS_META) and
// superadmin gates-table.tsx — the same badge renders services, gates,
// tenants and appointment states across every panel (design_handoff_paneli
// §6: colored dot + text, never color alone).

export function OkAndWait() {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <StatusBadge tone="ok">Aktivan klijent</StatusBadge>
      <StatusBadge tone="wait">Čeka potvrdu</StatusBadge>
    </div>
  );
}

export function DangerAndAmber() {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <StatusBadge tone="danger">Otkazao klijent</StatusBadge>
      <StatusBadge tone="amber">Ponuda poslata</StatusBadge>
    </div>
  );
}

export function SoftAndDark() {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <StatusBadge tone="soft">Predložena izmena</StatusBadge>
      <StatusBadge tone="dark">Kompanijski termin</StatusBadge>
    </div>
  );
}

export function Neutral() {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <StatusBadge tone="neutral">Isključeno</StatusBadge>
      <StatusBadge tone="neutral">Neaktivan</StatusBadge>
    </div>
  );
}
