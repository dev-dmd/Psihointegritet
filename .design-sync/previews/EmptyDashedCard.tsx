import { EmptyDashedCard } from "psihointegritet-ds";

// Dashed placeholder card for planned modules — copy ported from
// coming-soon-section.tsx (no badge) and screen-podesavanja.tsx (soon badge).

export function AuditLog() {
  return (
    <EmptyDashedCard title="Audit Log">
      Ko, koja akcija, nad kojim tenantom, prethodna i nova vrednost, razlog,
      vreme — zapisi već nastaju kroz Feature Gates.
    </EmptyDashedCard>
  );
}

export function PodesavanjaCentra() {
  return (
    <EmptyDashedCard title="Podešavanja centra" soon>
      Radno vreme centra, pravila otkazivanja i opšte postavke.
    </EmptyDashedCard>
  );
}
