"use client";

import { useTranslations } from "next-intl";

import {
  canHideContentField,
  normalizeContentFieldOverride,
  type ContentFieldOverride,
} from "@/lib/content-governance/content-field-override";
import { emptyRichDoc } from "@/lib/content-governance/rich-doc";
import type { SlotFieldSpec } from "@/lib/content-governance/slot-schema";
import type { ContentTemplate } from "@/lib/content-governance/types";

import { SlotFieldEditor } from "./slot-field-editor";

export function ContentFieldOverrideEditor({
  template,
  slotName,
  fieldName,
  spec,
  value,
  onChange,
}: {
  template: ContentTemplate;
  slotName: string;
  fieldName: string;
  spec: SlotFieldSpec;
  value: unknown;
  onChange: (next: ContentFieldOverride<unknown>) => void;
}) {
  const t = useTranslations("content.fieldOverride");
  const normalized = normalizeContentFieldOverride(value);
  const mode = normalized.valid ? normalized.mode : "inherit";
  const customValue =
    normalized.valid && normalized.mode === "custom"
      ? normalized.value
      : defaultCustomValue(spec);
  const hideable = canHideContentField(template, slotName, fieldName);

  return (
    <div className="border-line bg-panel-canvas/45 mb-3 rounded-xl border px-3 py-3">
      <div
        className="mb-2 flex flex-wrap gap-1.5"
        role="group"
        aria-label={t("statusLabel", { field: humanizeFieldName(fieldName) })}
      >
        <StatusButton
          active={mode === "inherit"}
          onClick={() => onChange({ mode: "inherit" })}
        >
          {t("inherit")}
        </StatusButton>
        <StatusButton
          active={mode === "custom"}
          onClick={() => onChange({ mode: "custom", value: customValue })}
        >
          {t("custom")}
        </StatusButton>
        {hideable ? (
          <StatusButton
            active={mode === "hidden"}
            onClick={() => onChange({ mode: "hidden" })}
          >
            {t("hidden")}
          </StatusButton>
        ) : null}
      </div>

      {mode === "inherit" ? (
        <p className="text-ink-55 text-[12px]">{t("inheritHelp")}</p>
      ) : null}
      {mode === "hidden" ? (
        <p className="text-ink-55 text-[12px]">{t("hiddenHelp")}</p>
      ) : null}
      {mode === "custom" ? (
        <SlotFieldEditor
          fieldName={fieldName}
          spec={spec}
          value={customValue}
          onChange={(next) => onChange({ mode: "custom", value: next })}
        />
      ) : null}
    </div>
  );
}

function defaultCustomValue(spec: SlotFieldSpec): unknown {
  switch (spec.kind) {
    case "text":
      return "";
    case "rich":
      return emptyRichDoc();
    case "integer":
    case "money":
      return spec.min;
    case "boolean":
      return false;
    case "image":
    case "cta":
      return {};
    case "imageList":
    case "ctaList":
    case "repeater":
      return [];
  }
}

function StatusButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`cursor-pointer rounded-full border px-3 py-1 text-[11.5px] font-semibold transition-colors ${
        active
          ? "border-forest bg-forest text-panel-canvas"
          : "border-line-strong text-ink-70 hover:border-coffee/40 bg-transparent"
      }`}
    >
      {children}
    </button>
  );
}

function humanizeFieldName(name: string): string {
  return name
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/_/g, " ")
    .replace(/^./, (char) => char.toUpperCase());
}
