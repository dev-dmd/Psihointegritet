"use client";

import Link from "next/link";
import { useLocale } from "next-intl";
import type { ComponentProps } from "react";
import type { UrlObject } from "url";

import type { UiLocale } from "@/i18n/locales";
import { localizePublicHref } from "@/lib/routes/public-path";

/**
 * A Next link whose registered public path follows the active UI locale.
 * External, anchor and unregistered paths pass through unchanged.
 */
type PublicLinkProps = Omit<ComponentProps<typeof Link>, "href"> & {
  href: string | UrlObject;
};

export function PublicLink({ href, ...props }: PublicLinkProps) {
  const locale = useLocale() as UiLocale;
  const localizedHref =
    typeof href === "string" ? localizePublicHref(href, locale) : href;

  return (
    <Link
      href={localizedHref as ComponentProps<typeof Link>["href"]}
      {...props}
    />
  );
}
