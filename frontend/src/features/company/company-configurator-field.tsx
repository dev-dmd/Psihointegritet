interface CompanyConfiguratorFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}

export function CompanyConfiguratorField({
  label,
  value,
  onChange,
  type = "text",
}: CompanyConfiguratorFieldProps) {
  return (
    <label className="text-coffee/70 text-[13px] font-medium">
      {label}
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="border-coffee/15 bg-surface text-coffee focus:border-sage mt-1.5 w-full rounded-2xl border px-4 py-2.5 text-[15px] outline-none"
      />
    </label>
  );
}
