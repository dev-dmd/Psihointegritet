import { LogoutAvatarMenu } from "psihointegritet-ds";

// Real triggerClassName strings + initials, taken from the three panel
// topbars that use this component (account, workspace, superadmin). This
// sync's @clerk/nextjs shim always returns a signed-in user with no photo,
// so every cell renders the initials fallback — that's expected, not a bug.
// The superadmin variant also carries a `children` slot (BackToSiteMenuItem
// in the real app); we stand in a plain extra item here since
// BackToSiteMenuItem lives in a sibling preview file we don't own.

export function AccountPanelTrigger() {
  return (
    <LogoutAvatarMenu
      initials="MP"
      label="Korisnički meni"
      triggerClassName="border-meadow/55 bg-meadow/20 text-forest hover:border-sage focus-visible:ring-forest/35 flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border text-[13px] font-semibold outline-none transition-colors focus-visible:ring-2"
    />
  );
}

export function SuperadminTriggerWithExtraItem() {
  return (
    <LogoutAvatarMenu
      initials="SA"
      label="Korisnički meni"
      triggerClassName="border-warm/55 bg-warm/20 text-coffee hover:border-warm focus-visible:ring-coffee/35 flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border text-[12px] font-bold tracking-[0.05em] outline-none transition-colors focus-visible:ring-2"
    >
      <a
        href="/"
        target="_blank"
        rel="noopener noreferrer"
        className="text-coffee data-[focus]:bg-coffee/8 flex w-full items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-[13.5px] font-semibold no-underline transition-colors"
      >
        Glavni sajt
      </a>
    </LogoutAvatarMenu>
  );
}
