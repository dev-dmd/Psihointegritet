import { useState } from "react";
import { TabPills } from "psihointegritet-ds";

// TabPills is controlled (activeId + onChange) — real usage always wires it
// to local state (screen-termini.tsx, tenant-profile-view.tsx), so each
// story wraps it the same way so a click actually swaps the active pill.

const terminiTabs = [
  { id: "danas", label: "Danas" },
  { id: "nedelja", label: "Nedelja" },
  { id: "predstojeci", label: "Predstojeći" },
  { id: "zahtevi", label: "Zahtevi · 4" },
  { id: "cekanje", label: "Lista čekanja" },
];

export function Termini() {
  const [tab, setTab] = useState("danas");
  return <TabPills tabs={terminiTabs} activeId={tab} onChange={setTab} />;
}

const tenantProfileTabs = [
  { id: "pregled", label: "Pregled" },
  { id: "funkcionalnosti", label: "Funkcionalnosti" },
  { id: "potrosnja", label: "Potrošnja" },
  { id: "korisnici", label: "Korisnici · uskoro", disabled: true },
  { id: "pretplata", label: "Pretplata · uskoro", disabled: true },
];

export function TenantProfilSaDisabled() {
  const [tab, setTab] = useState("funkcionalnosti");
  return <TabPills tabs={tenantProfileTabs} activeId={tab} onChange={setTab} />;
}
