/**
 * Serbian enumeration: „A, B i C" — commas between all but the last pair, „i"
 * before the final item.
 *
 * `Array.join(" i ")` is the trap this exists to close. It reads correctly with
 * two items and turns into „Chicago i Milwaukee i Madison" the moment a third
 * appears, which is exactly what happened when the centre moved from two
 * locations to three (D-076).
 */
export function joinSerbianList(items: readonly string[]): string {
  if (items.length === 0) return "";
  if (items.length === 1) return items[0] ?? "";
  const last = items[items.length - 1] ?? "";
  return `${items.slice(0, -1).join(", ")} i ${last}`;
}
