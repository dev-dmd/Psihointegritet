import type { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  description: string;
  /** Right-hand slot for screen-level actions (save, back link, status). */
  actions?: ReactNode;
}

/** Screen H1 + muted subtitle, shared by all Control Center screens. */
export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-forest mb-1.5 font-serif text-[26px] leading-[1.1] font-normal md:text-[34px]">
          {title}
        </h1>
        <p className="text-ink-55 max-w-[640px] text-[14.5px]">{description}</p>
      </div>
      {actions ? (
        <div className="flex flex-wrap items-center gap-2.5">{actions}</div>
      ) : null}
    </div>
  );
}
