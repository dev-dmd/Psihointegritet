"use client";

import { useState } from "react";

import { cn } from "@/helpers/cn";
import { sanjaContent } from "@/features/tenants/sanja-neuer/content";
import { sanjaVideos } from "@/features/tenants/sanja-neuer/videos";
import { BookButton } from "@/features/tenants/sanja-neuer/ui/book-button";
import { Eyebrow } from "@/features/tenants/sanja-neuer/ui/eyebrow";
import { SectionHeading } from "@/features/tenants/sanja-neuer/ui/section-heading";

const { blog } = sanjaContent;

/**
 * A YouTube watch-page hierarchy: one article-sized player column, one episode
 * list beside it, selection swapping the left column.
 *
 * **No thumbnails yet.** The design frames each video on an ink ground with a
 * burgundy play circle over it; with no artwork the frame simply renders
 * without an image rather than with a grey box pretending to be one. When real
 * ids arrive this becomes a `youtube-nocookie` embed and the chapter rows seek
 * into it — which is why chapters are rendered as buttons already, and not as
 * links to `#`.
 */
export function SanjaVideoBlog() {
  const [selectedId, setSelectedId] = useState(sanjaVideos[0]!.id);
  const featured =
    sanjaVideos.find((video) => video.id === selectedId) ?? sanjaVideos[0]!;

  return (
    <section id="blog" className="bg-sn-ivory">
      <div className="mx-auto max-w-[1180px] px-6 py-[88px]">
        <div className="mb-10 flex flex-wrap items-end justify-between gap-5">
          <div className="max-w-[620px]">
            <Eyebrow tone="lilac">{blog.eyebrow}</Eyebrow>
            <SectionHeading>{blog.title}</SectionHeading>
          </div>
          <a
            href="https://www.youtube.com/"
            target="_blank"
            rel="noreferrer"
            className="border-sn-ink/28 text-sn-ink hover:bg-sn-ink hover:text-sn-ivory rounded-full border px-[22px] py-[13px] text-[13px] tracking-[0.1em] uppercase transition-colors"
          >
            {blog.channelCta}
          </a>
        </div>

        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,320px),1fr))] items-start gap-9">
          <div>
            <div className="border-sn-ink/15 bg-sn-ink relative aspect-video overflow-hidden rounded-2xl border">
              <span
                aria-hidden
                className="pointer-events-none absolute inset-0 flex items-center justify-center"
              >
                <span className="bg-sn-burgundy/92 flex size-[72px] items-center justify-center rounded-full">
                  <span className="border-l-sn-ivory ml-[5px] block size-0 border-t-[12px] border-b-[12px] border-l-[20px] border-t-transparent border-b-transparent" />
                </span>
              </span>
              <span className="bg-sn-ink/85 text-sn-ivory absolute right-3 bottom-3 rounded-md px-[9px] py-[5px] text-xs tracking-[0.06em]">
                {featured.duration}
              </span>
            </div>

            <h3 className="font-sn-display text-sn-ink mt-[22px] mb-2.5 text-[clamp(24px,2.6vw,32px)] leading-[1.26] font-normal text-pretty">
              {featured.title}
            </h3>
            <p className="text-sn-ink/55 mb-[18px] text-[13px] tracking-[0.06em]">
              {featured.meta}
            </p>
            <p className="text-sn-ink/78 mb-3.5 text-base leading-[1.8]">
              {featured.lead}
            </p>
            <p className="text-sn-ink/70 mb-5 text-[15px] leading-[1.8]">
              {featured.body}
            </p>

            <ul className="mb-[26px] flex list-none flex-wrap gap-2 p-0">
              {featured.tags.map((tag) => (
                <li
                  key={tag}
                  className="bg-sn-lilac/28 text-sn-lilac-deep rounded-full px-[13px] py-[7px] text-xs tracking-[0.06em]"
                >
                  #{tag}
                </li>
              ))}
            </ul>

            <div className="border-sn-ink/12 border-t pt-5">
              <p className="text-sn-ink/50 mb-3.5 text-[11px] tracking-[0.2em] uppercase">
                {blog.chaptersLabel}
              </p>
              <ul className="flex list-none flex-col gap-0.5 p-0">
                {featured.chapters.map((chapter) => (
                  <li key={chapter.at}>
                    <div className="hover:bg-sn-lilac/22 flex items-baseline gap-4 rounded-lg px-2.5 py-[9px] transition-colors">
                      <span className="font-sn-display text-sn-burgundy min-w-12 text-base">
                        {chapter.at}
                      </span>
                      <span className="text-sn-ink/78 text-[15px] leading-[1.5]">
                        {chapter.label}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <div className="border-sn-lilac mt-7 flex flex-wrap items-center justify-between gap-4 rounded-2xl border px-6 py-[22px]">
              <p className="text-sn-ink/78 max-w-[340px] text-[15px] leading-[1.6]">
                {blog.ctaStripText}
              </p>
              <BookButton
                variant="primary"
                className="px-6 py-[13px] text-xs whitespace-nowrap"
              >
                {blog.ctaStripButton}
              </BookButton>
            </div>
          </div>

          <div className="flex flex-col gap-3.5">
            <p className="text-sn-ink/50 mb-0.5 text-[11px] tracking-[0.2em] uppercase">
              {blog.episodesLabel}
            </p>
            {sanjaVideos.map((video) => {
              const isSelected = video.id === featured.id;
              return (
                <button
                  key={video.id}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => setSelectedId(video.id)}
                  className={cn(
                    "focus-visible:ring-sn-burgundy/40 hover:border-sn-burgundy grid cursor-pointer grid-cols-[minmax(96px,140px)_minmax(0,1fr)] items-start gap-4 rounded-[14px] border p-3 text-left transition-colors outline-none focus-visible:ring-2",
                    isSelected
                      ? "bg-sn-lilac/40 border-sn-burgundy"
                      : "bg-sn-surface border-sn-ink/12",
                  )}
                >
                  <span className="bg-sn-ink relative block aspect-video overflow-hidden rounded-[9px]">
                    <span className="bg-sn-ink/85 text-sn-ivory absolute right-1.5 bottom-1.5 rounded px-1.5 py-[3px] text-[10px]">
                      {video.duration}
                    </span>
                  </span>
                  <span className="flex flex-col gap-1.5">
                    <span className="font-sn-display text-sn-ink block text-xl leading-[1.3]">
                      {video.title}
                    </span>
                    <span className="text-sn-ink/55 block text-xs tracking-[0.04em]">
                      {video.meta}
                    </span>
                    <span className="text-sn-ink/65 block text-[13px] leading-[1.55]">
                      {video.short}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
