"use client";

export function ActionButton({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="border-line-strong text-ink-70 hover:border-coffee/40 cursor-pointer rounded-full border bg-transparent px-5 py-2.5 text-[13px] font-semibold transition-colors"
    >
      {label}
    </button>
  );
}
