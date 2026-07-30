import { ProgressBar } from "psihointegritet-ds";

// Real occupancy/capacity values: light tone from screen-terapeuti.tsx
// (therapist occupancy) and screen-istrazivanja.tsx (survey answer bar),
// dark tone from screen-pregled.tsx (week occupancy card on the forest bg).

export function TerapeutPopunjenost() {
  return (
    <div className="w-64">
      <div className="text-ink-55 mb-1.5 flex justify-between text-[12.5px]">
        <span>18 klijenata</span>
        <span>Popunjenost 82%</span>
      </div>
      <ProgressBar value={82} />
    </div>
  );
}

export function AnketaOdgovor() {
  return (
    <div className="w-64">
      <div className="text-ink-55 mb-1 flex justify-between text-[12.5px]">
        <span>Nesigurnost šta da očekujem</span>
        <span>34%</span>
      </div>
      <ProgressBar value={34} />
    </div>
  );
}

export function NedeljaTamniTon() {
  return (
    <div className="bg-forest w-64 rounded-xl p-4">
      <div className="grid grid-cols-[34px_1fr_34px] items-center gap-3">
        <span className="text-canvas/65 text-xs font-semibold">Pon</span>
        <ProgressBar value={63} tone="dark" />
        <span className="text-canvas/60 text-right text-xs">5/8</span>
      </div>
    </div>
  );
}
