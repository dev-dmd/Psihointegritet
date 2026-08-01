import { BackToSiteButton } from "psihointegritet-ds";

// Real usage: every panel topbar (Klijent Panel, Control Center, Superadmin
// desktop) renders this with this exact className, taken verbatim from
// src/features/account/components/topbar.tsx and its siblings (workspace,
// superadmin). It's a `target="_blank"` link back to the marketing site,
// morphing from an icon-only circle to an icon+label pill at `lg:`.

export function TopbarButton() {
  return (
    <BackToSiteButton className="border-coffee/12 text-coffee hover:border-sage bg-surface" />
  );
}

export function InTopbarContext() {
  return (
    <div className="bg-panel-canvas/88 border-coffee/8 flex items-center gap-3.5 border-b px-4 py-2.5">
      <span className="text-forest font-serif text-xl font-medium">
        Psihointegritet
      </span>
      <span className="flex-1" />
      <BackToSiteButton className="border-coffee/12 text-coffee hover:border-sage bg-surface" />
    </div>
  );
}
