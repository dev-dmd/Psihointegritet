import { MonogramAvatar } from "psihointegritet-ds";

// Real therapist data from src/content/therapists.ts (same records used in
// TherapistCard.tsx's preview). imageSrc is intentionally omitted: the
// component's own JSDoc says photos are "placeholder until real portraits
// are approved", so initials-only IS the current production state, not a
// preview shortcut. "md" is the default size used in therapist-card.tsx and
// other-therapists-section.tsx; "sm" is used in guidance-flow.tsx's compact
// therapist-match row.
export function Medium() {
  return <MonogramAvatar initials="AS" name="Anja Stamenković" />;
}

export function Small() {
  return <MonogramAvatar initials="MS" name="Marija Stamenković" size="sm" />;
}
