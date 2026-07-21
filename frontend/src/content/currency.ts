const rsdFormatter = new Intl.NumberFormat("sr-Latn-RS", {
  maximumFractionDigits: 0,
});

/** 4000 -> "4.000 RSD" */
export function formatRsd(amount: number): string {
  return `${rsdFormatter.format(amount)} RSD`;
}
