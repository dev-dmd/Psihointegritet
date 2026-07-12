import { ArrowLink } from "@/components/ui/arrow-link";
import { Chip } from "@/components/ui/chip";
import type { ResourceArticle } from "@/content/homepage";

interface ResourceCardProps {
  article: ResourceArticle;
}

export function ResourceCard({ article }: ResourceCardProps) {
  return (
    <article className="bg-surface border-coffee/6 hover:shadow-card-hover flex flex-col gap-5 rounded-3xl border px-8 pt-[34px] pb-[30px] transition-all duration-[250ms] hover:-translate-y-1">
      <Chip variant="labelWarm" className="self-start">
        {article.category}
      </Chip>
      <h3 className="text-forest font-serif text-[26px] leading-[1.2] font-normal text-pretty">
        {article.title}
      </h3>
      <p className="text-coffee/68 grow text-[14.5px] leading-[1.62]">
        {article.description}
      </p>
      <ArrowLink href="#resursi">Pročitaj tekst</ArrowLink>
    </article>
  );
}
