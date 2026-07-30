/**
 * Client-side mirror of the narrow backend safety signal. It only decides
 * whether to show an immediate-support notice in the current browser; the
 * backend remains the authority for priority review after submission.
 */
const IMMEDIATE_DANGER_PHRASES = [
  "zelim da se ubijem",
  "želim da se ubijem",
  "hocu da se ubijem",
  "hoću da se ubijem",
  "planiram da se ubijem",
  "samoubistv",
  "samoubojstv",
  "povredim sebe",
  "povrijedim sebe",
  "samopovred",
  "samopovređ",
  "trenutno sam u opasnosti",
  "u neposrednoj sam opasnosti",
] as const;

export function hasImmediateSafetySignal(value: string): boolean {
  const normalized = value.toLocaleLowerCase("sr-Latn");
  const compact = normalized.replace(/\s+/g, " ").trim();
  return (
    compact.length > 0 &&
    IMMEDIATE_DANGER_PHRASES.some((phrase) => compact.includes(phrase))
  );
}
