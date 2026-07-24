import { StatCard } from "psihointegritet-ds";

// Real value/label/dot combos from superadmin/data.ts platformStats — the
// 8-tile "Pregled platforme" grid on the superadmin overview page.

export function AktivniKorisnici() {
  return <StatCard value="24" label="Aktivni korisnici" dot="meadow" />;
}

export function ZahtevaCeka() {
  return <StatCard value="3" label="Zahteva čeka" dot="warm" />;
}

export function SistemskoUpozorenje() {
  return <StatCard value="1" label="Sistemsko upozorenje" dot="danger" />;
}

export function BezTacke() {
  return <StatCard value="72%" label="Completion rate" />;
}
