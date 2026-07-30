export interface ActorSummary {
  userId: string;
  displayName: string;
  isSuperadmin: boolean;
}

export function ActorBadge({
  action,
  actor,
}: {
  action: string;
  actor: ActorSummary | null;
}) {
  if (!actor) return null;

  return (
    <span className="bg-badge-neutral-bg text-badge-neutral inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold">
      <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-current" />
      {action}: {actor.displayName}
      {actor.isSuperadmin ? " · superadmin" : ""}
    </span>
  );
}
