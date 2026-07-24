import { useState } from "react";
import { Toggle } from "psihointegritet-ds";

// Toggle is controlled (checked + onChange) — real usage (gates-table.tsx,
// screen-profil.tsx) always wires it to component state, so each story
// wraps it the same way instead of passing a bare boolean.
export function On() {
  const [checked, setChecked] = useState(true);
  return <Toggle checked={checked} onChange={setChecked} label="Uključi funkciju" />;
}

export function Off() {
  const [checked, setChecked] = useState(false);
  return <Toggle checked={checked} onChange={setChecked} label="Uključi funkciju" />;
}

export function Disabled() {
  const [checked, setChecked] = useState(true);
  return <Toggle checked={checked} onChange={setChecked} label="Uključi funkciju" disabled />;
}
