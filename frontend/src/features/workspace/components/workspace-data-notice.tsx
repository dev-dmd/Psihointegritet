"use client";

import { useTranslations } from "next-intl";

import { useFallbackContent } from "@/content/use-content";

export function WorkspaceDataNotice() {
  const t = useTranslations("workspace.demoData");
  const mode = useFallbackContent().metadata.demoDataMode;
  const copy =
    mode === "showcase"
      ? { title: t("showcaseTitle"), description: t("showcaseDescription") }
      : mode === "empty"
        ? { title: t("emptyTitle"), description: t("emptyDescription") }
        : { title: t("blankTitle"), description: t("blankDescription") };

  return (
    <aside
      data-content-data-mode={mode}
      className="border-sage/35 bg-sage/8 rounded-tile mb-5 border px-4 py-3"
    >
      <p className="text-forest text-[13px] font-semibold">{copy.title}</p>
      <p className="text-ink-55 mt-0.5 text-[12.5px] leading-[1.5]">
        {copy.description}
      </p>
    </aside>
  );
}
