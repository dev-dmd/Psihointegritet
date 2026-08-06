"use client";

const inputClass =
  "border-line-strong text-ink-90 bg-surface focus-visible:ring-coffee rounded-full border px-4 py-2 text-[13px] placeholder:text-ink-45 focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:outline-none";

/** Shared "create a new area/topic" mini-form used by `ArticleTaxonomyStep`
 *  for both taxonomy axes — the two forms differ only in copy and state. */
export function ArticleTaxonomyTermForm({
  title,
  labelPlaceholder,
  label,
  onLabelChange,
  description,
  onDescriptionChange,
  searchTerms,
  onSearchTermsChange,
  saving,
  savingLabel,
  saveLabel,
  error,
  onSave,
  onCancel,
}: {
  title: string;
  labelPlaceholder: string;
  label: string;
  onLabelChange: (value: string) => void;
  description: string;
  onDescriptionChange: (value: string) => void;
  searchTerms: string;
  onSearchTermsChange: (value: string) => void;
  saving: boolean;
  savingLabel: string;
  saveLabel: string;
  error: string | null;
  onSave: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="rounded-tile border-line bg-surface mt-1 flex flex-col gap-3 border px-4 py-3">
      <p className="text-forest text-[13px] font-semibold">{title}</p>
      <input
        type="text"
        value={label}
        onChange={(e) => onLabelChange(e.target.value)}
        placeholder={labelPlaceholder}
        className={inputClass}
        disabled={saving}
      />
      <input
        type="text"
        value={description}
        onChange={(e) => onDescriptionChange(e.target.value)}
        placeholder="Kratak opis"
        className={inputClass}
        disabled={saving}
      />
      <input
        type="text"
        value={searchTerms}
        onChange={(e) => onSearchTermsChange(e.target.value)}
        placeholder="Izrazi za pretragu, odvojeni zarezom"
        className={inputClass}
        disabled={saving}
      />
      {error ? <p className="text-danger text-[12px]">{error}</p> : null}
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={saving || !label.trim()}
          onClick={onSave}
          className="border-forest bg-forest text-panel-canvas min-h-10 cursor-pointer rounded-full border px-4 text-[12px] font-semibold disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? savingLabel : saveLabel}
        </button>
        <button
          type="button"
          disabled={saving}
          onClick={onCancel}
          className="text-ink-55 cursor-pointer text-[12px] underline"
        >
          Odustani
        </button>
      </div>
    </div>
  );
}
