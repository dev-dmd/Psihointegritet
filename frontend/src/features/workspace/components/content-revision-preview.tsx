import type { Route } from "next";
import Link from "next/link";

import { RichText } from "@/components/content/rich-text";
import { PageHero } from "@/components/shared/page-hero";
import {
  CmsContentProvider,
  type PublishedContentOverride,
} from "@/lib/content-governance/cms-provider";
import type { RichDoc } from "@/lib/content-governance/rich-doc";
import { staticContentProvider } from "@/lib/content-governance/static-provider";
import type { ContentEntity } from "@/lib/content-governance/types";
import { localizedPath } from "@/lib/routes/localized-path";
import { useUiLocale } from "@/i18n/use-ui-locale";

import type { ApiContentRevision } from "../content-api";

type SlotOverride = {
  mode?: "inherit" | "override" | "hidden";
  fields?: Record<string, unknown>;
};

function isRichDoc(value: unknown): value is RichDoc {
  if (!value || typeof value !== "object") return false;
  const candidate = value as { schemaVersion?: unknown; blocks?: unknown };
  if (candidate.schemaVersion !== 1 || !Array.isArray(candidate.blocks)) {
    return false;
  }
  return candidate.blocks.every((rawBlock) => {
    if (!rawBlock || typeof rawBlock !== "object") return false;
    const block = rawBlock as Record<string, unknown>;
    if (typeof block.id !== "string" || typeof block.type !== "string") {
      return false;
    }
    if (block.type === "list") {
      return (
        Array.isArray(block.items) &&
        block.items.every((rawItem) => {
          if (!rawItem || typeof rawItem !== "object") return false;
          const item = rawItem as Record<string, unknown>;
          return (
            typeof item.id === "string" &&
            Array.isArray(item.spans) &&
            item.spans.every(isSafeSpan)
          );
        })
      );
    }
    return (
      ["heading", "paragraph", "quote"].includes(block.type) &&
      Array.isArray(block.spans) &&
      block.spans.every(isSafeSpan)
    );
  });
}

function isSafeSpan(value: unknown): boolean {
  const marks = (value as Record<string, unknown> | null)?.marks;
  return (
    Boolean(value) &&
    typeof value === "object" &&
    typeof (value as Record<string, unknown>).text === "string" &&
    (marks === undefined || (Array.isArray(marks) && marks.every(isSafeMark)))
  );
}

function isSafeMark(value: unknown): boolean {
  if (value === "bold" || value === "italic" || value === "underline") {
    return true;
  }
  return (
    Boolean(value) &&
    typeof value === "object" &&
    (value as Record<string, unknown>).type === "link" &&
    typeof (value as Record<string, unknown>).href === "string"
  );
}

function headingAndLead(entity: ContentEntity): {
  heading: string;
  lead: string;
} {
  switch (entity.type) {
    case "static_page":
      return { heading: entity.h1, lead: entity.seo.description };
    case "service":
      return {
        heading: entity.source.name,
        lead: entity.source.description,
      };
    case "therapist":
      return { heading: entity.source.name, lead: entity.source.title };
    case "program":
      return { heading: entity.source.title, lead: entity.source.audience };
    case "company_plan":
      return {
        heading: entity.source.title,
        lead: entity.source.description,
      };
    case "package_offer":
      return {
        heading: `${entity.source.sessions} individualnih seansi`,
        lead: entity.source.deadline,
      };
  }
}

function PreviewValue({ value }: { value: unknown }) {
  if (value === null || value === undefined || value === "") return null;
  if (isRichDoc(value)) {
    return <RichText doc={value} className="mt-2" />;
  }
  if (typeof value === "string" || typeof value === "number") {
    return (
      <p className="text-coffee/78 mt-1 text-[16px] leading-[1.7]">
        {String(value)}
      </p>
    );
  }
  if (typeof value === "boolean") {
    return <p className="text-coffee/65 mt-1 text-sm">{value ? "Da" : "Ne"}</p>;
  }
  if (Array.isArray(value)) {
    return (
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        {value.map((item, index) => (
          <div
            key={index}
            className="border-coffee/10 bg-canvas rounded-[16px] border p-4"
          >
            <PreviewValue value={item} />
          </div>
        ))}
      </div>
    );
  }
  if (typeof value === "object") {
    const object = value as Record<string, unknown>;
    if (typeof object.action === "string") {
      return (
        <span className="bg-forest text-canvas mt-2 inline-flex rounded-full px-5 py-2.5 text-sm font-semibold">
          {typeof object.label === "string" && object.label
            ? object.label
            : object.action}
        </span>
      );
    }
    if (typeof object.assetId === "string") {
      return (
        <div className="border-line bg-panel-canvas mt-2 rounded-xl border px-4 py-3">
          <p className="text-coffee text-sm font-semibold">
            Slika: {object.assetId}
          </p>
          {typeof object.alt === "string" && object.alt ? (
            <p className="text-ink-70 mt-1 text-sm">Alt: {object.alt}</p>
          ) : null}
        </div>
      );
    }
    return (
      <div className="space-y-3">
        {Object.entries(object).map(([key, item]) => (
          <div key={key}>
            <div className="text-sage text-[11px] font-semibold tracking-[0.12em] uppercase">
              {key.replace(/_/g, " ")}
            </div>
            <PreviewValue value={item} />
          </div>
        ))}
      </div>
    );
  }
  return null;
}

export function ContentRevisionPreview({
  revision,
}: {
  revision: ApiContentRevision;
}) {
  const locale = useUiLocale();
  const fallback =
    staticContentProvider
      .listAll()
      .find(
        (entity) =>
          entity.type === revision.contentType &&
          entity.canonicalSlug === revision.slug,
      ) ?? null;

  if (!fallback) {
    return (
      <div className="border-danger/40 bg-danger/8 rounded-panel border p-6">
        <h1 className="text-forest font-serif text-3xl">
          Pregled nije dostupan
        </h1>
        <p className="text-coffee/75 mt-3 leading-relaxed">
          Ovaj unos nema odgovarajuću sistemsku rutu i definisani renderer.
          Prema usvojenoj CMS politici ne može biti objavljen kao nova
          proizvoljna stranica.
        </p>
        <Link
          href={localizedPath("workspace.content.list", { locale })}
          className="text-forest mt-5 inline-flex font-semibold underline underline-offset-4"
        >
          Nazad na sadržaj
        </Link>
      </div>
    );
  }

  const override: PublishedContentOverride = {
    contentType: revision.contentType,
    management: revision.management,
    slug: revision.slug,
    locale: revision.locale,
    template: revision.template,
    slotData: revision.slotData,
    seo: revision.seo,
    publishedAt: revision.updatedAt,
  };
  const provider = new CmsContentProvider(staticContentProvider, [override]);
  const entity = provider.getEntityById(fallback.id) ?? fallback;
  const { heading, lead } = headingAndLead(entity);
  const route = entity.route as Route;

  return (
    <div className="border-coffee/10 bg-canvas overflow-hidden rounded-[28px] border">
      <div className="bg-badge-amber-bg border-badge-amber/35 text-coffee border-b px-5 py-3 text-sm">
        <strong>Privatni pregled sačuvane revizije.</strong> Nije javno
        objavljena i ne ulazi u sitemap ni javni CMS keš. Status:{" "}
        {revision.status} · {revision.versionLabel}.
      </div>

      <PageHero id="cms-pregled">
        <div className="max-w-[780px]">
          <p className="text-sage mb-4 text-[12px] font-semibold tracking-[0.14em] uppercase">
            Pregled · {revision.template}
          </p>
          <h1 className="text-forest font-serif text-[clamp(32px,7vw,52px)] leading-[1.08] font-normal">
            {heading}
          </h1>
          <p className="text-coffee/75 mt-4 max-w-[700px] text-[16.5px] leading-[1.65]">
            {lead}
          </p>
        </div>
      </PageHero>

      <div className="mx-auto max-w-[920px] px-5 py-12 md:px-8 md:py-16">
        {Object.entries(revision.slotData).map(([slotName, rawSlot]) => {
          const slot =
            rawSlot && typeof rawSlot === "object"
              ? (rawSlot as SlotOverride)
              : {};
          return (
            <section
              key={slotName}
              className="border-coffee/10 mb-5 rounded-[20px] border bg-white/55 p-5 md:p-7"
            >
              <h2 className="text-forest font-serif text-2xl">
                {slotName.replace(/_/g, " ")}
              </h2>
              {slot.mode === "hidden" ? (
                <p className="text-ink-55 mt-2 text-sm">
                  Sekcija je sakrivena u ovoj reviziji.
                </p>
              ) : slot.mode === "override" ? (
                <div className="mt-4 space-y-5">
                  {Object.entries(slot.fields ?? {}).map(([name, value]) => (
                    <div key={name}>
                      <h3 className="text-coffee text-sm font-semibold">
                        {name.replace(/_/g, " ")}
                      </h3>
                      <PreviewValue value={value} />
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-ink-55 mt-2 text-sm">
                  Koristi sistemski sadržaj i raspored sa rute {entity.route}.
                </p>
              )}
            </section>
          );
        })}

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href={localizedPath("workspace.content.list", { locale })}
            className="border-line-strong text-forest rounded-full border px-5 py-2.5 text-sm font-semibold"
          >
            Nazad na editor
          </Link>
          {revision.status === "published" ? (
            <Link
              href={route}
              className="bg-forest text-canvas rounded-full px-5 py-2.5 text-sm font-semibold"
            >
              Otvori javnu stranicu
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}
