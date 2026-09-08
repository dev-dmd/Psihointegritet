import { cn } from "@/helpers/cn";

const CONTROL =
  "bg-sn-surface border-sn-ink/18 focus:border-sn-burgundy rounded-[10px] border px-3.5 py-[13px] text-[15px] outline-none transition-colors";

const LABEL = "text-sn-ink/60 text-[11px] tracking-[0.16em] uppercase";

/**
 * The form's controls, kept together so the eight fields cannot drift apart
 * visually. Every one is a labelled control — the design shows a label above
 * each input, and wrapping rather than using `placeholder` as the label is what
 * keeps that true for a screen reader too.
 */
export function TextField({
  name,
  label,
  placeholder,
  type = "text",
  required = false,
}: {
  name: string;
  label: string;
  placeholder: string;
  type?: "text" | "email" | "tel";
  required?: boolean;
}) {
  return (
    <label className="flex flex-col gap-[7px]">
      <span className={LABEL}>{label}</span>
      <input
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        className={CONTROL}
      />
    </label>
  );
}

export function SelectField({
  name,
  label,
  options,
}: {
  name: string;
  label: string;
  options: readonly string[];
}) {
  return (
    <label className="flex flex-col gap-[7px]">
      <span className={LABEL}>{label}</span>
      <select name={name} className={CONTROL} defaultValue={options[0]}>
        {options.map((option) => (
          <option key={option}>{option}</option>
        ))}
      </select>
    </label>
  );
}

export function TextAreaField({
  name,
  label,
  placeholder,
}: {
  name: string;
  label: string;
  placeholder: string;
}) {
  return (
    <label className="col-span-full flex flex-col gap-[7px]">
      <span className={LABEL}>{label}</span>
      <textarea
        name={name}
        rows={4}
        placeholder={placeholder}
        className={cn(CONTROL, "resize-y font-[inherit]")}
      />
    </label>
  );
}

export function ConsentField({ name, label }: { name: string; label: string }) {
  return (
    <label className="col-span-full flex items-start gap-[11px]">
      <input
        name={name}
        type="checkbox"
        required
        className="accent-sn-burgundy mt-[3px] size-[17px]"
      />
      <span className="text-sn-ink/68 text-[13px] leading-[1.6]">{label}</span>
    </label>
  );
}
