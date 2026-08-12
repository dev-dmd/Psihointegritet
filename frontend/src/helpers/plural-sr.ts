/**
 * Serbian noun agreement after a numeral.
 *
 * Serbian has three forms, not two: 1 tema · 2 teme · 5 tema. The teens are the
 * trap — 11 and 12 take the "many" form even though they end in 1 and 2, so the
 * rule has to look at the last two digits before the last one. Getting this
 * wrong reads as broken copy on every count that crosses five, which on these
 * pages is most of them.
 */
export function pluralSr(
  count: number,
  one: string,
  few: string,
  many: string,
): string {
  const abs = Math.abs(Math.trunc(count));
  const lastTwo = abs % 100;
  const last = abs % 10;
  if (lastTwo >= 11 && lastTwo <= 14) return many;
  if (last === 1) return one;
  if (last >= 2 && last <= 4) return few;
  return many;
}

/** `5 tema`, `2 teme`, `1 tema`. */
export function countSr(
  count: number,
  one: string,
  few: string,
  many: string,
): string {
  return `${count} ${pluralSr(count, one, few, many)}`;
}
