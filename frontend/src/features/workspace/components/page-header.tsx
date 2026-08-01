interface PageHeaderProps {
  title: string;
  description: string;
}

/** Screen H1 + muted subtitle, shared by all Control Center screens. */
export function PageHeader({ title, description }: PageHeaderProps) {
  return (
    <div className="mb-6">
      <h1 className="text-forest mb-1.5 font-serif text-[26px] leading-[1.1] font-normal md:text-[34px]">
        {title}
      </h1>
      <p className="text-ink-55 max-w-[640px] text-[14.5px]">{description}</p>
    </div>
  );
}
