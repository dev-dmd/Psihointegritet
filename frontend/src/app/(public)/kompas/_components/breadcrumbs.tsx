import type { Route } from "next";
import { PublicLink as Link } from "@/components/ui/public-link";
import { useTranslations } from "next-intl";

import type { CompassBreadcrumb } from "@/lib/compass/discoverability";

interface CompassBreadcrumbsProps {
  items: readonly CompassBreadcrumb[];
}

export function CompassBreadcrumbs({ items }: CompassBreadcrumbsProps) {
  const t = useTranslations("public.compass.lists");
  return (
    <nav aria-label={t("breadcrumb")} className="mt-4 mb-6 text-[12px]">
      <ol className="flex flex-wrap items-center gap-y-1">
        {items.map((item, index) => {
          const isCurrent = index === items.length - 1;
          return (
            <li
              key={`${item.path}:${item.label}`}
              className="flex items-center"
            >
              {index > 0 ? (
                <span aria-hidden className="text-coffee/35 px-2">
                  /
                </span>
              ) : null}
              {isCurrent ? (
                <span aria-current="page" className="text-coffee">
                  {item.label}
                </span>
              ) : (
                <Link
                  href={item.path as Route}
                  className="text-coffee/60 hover:text-forest"
                >
                  {item.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
