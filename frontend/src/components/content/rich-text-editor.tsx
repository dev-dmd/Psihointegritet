"use client";

import Blockquote from "@tiptap/extension-blockquote";
import { ListItem } from "@tiptap/extension-list";
import UniqueID from "@tiptap/extension-unique-id";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useEffect, useState } from "react";

import {
  createBlockId,
  isAllowedHref,
  type RichDoc,
} from "@/lib/content-governance/rich-doc";
import {
  richDocToTiptapDoc,
  tiptapDocToRichDoc,
} from "@/lib/content-governance/rich-doc-adapter";

/**
 * `rich-doc-adapter.ts`'s 1:1 mapping depends on `blockquote`/`listItem`
 * containing exactly one paragraph — StarterKit's defaults allow more
 * (`block+`), so both are disabled there and replaced with restricted
 * variants here (ADR-017 §10).
 */
const RestrictedBlockquote = Blockquote.extend({ content: "paragraph" });
const RestrictedListItem = ListItem.extend({ content: "paragraph" });

const EXTENSIONS = [
  StarterKit.configure({
    // Not in RichDoc v1 — ADR-017 §5/§6/"What this ADR does NOT open".
    codeBlock: false,
    code: false,
    horizontalRule: false,
    strike: false,
    hardBreak: false,
    // Replaced below with content-restricted variants.
    blockquote: false,
    listItem: false,
    // H1 comes from the page title slot, never the body (ADR-017 §3).
    heading: { levels: [2, 3, 4] },
    link: {
      openOnClick: false,
      // Same allowlist as the backend normalizer and the plain renderer
      // (RICH-003) — https://, mailto:, internal routes only.
      isAllowedUri: (url) => isAllowedHref(url),
    },
  }),
  RestrictedBlockquote,
  RestrictedListItem,
  UniqueID.configure({
    attributeName: "id",
    types: [
      "heading",
      "paragraph",
      "blockquote",
      "listItem",
      "bulletList",
      "orderedList",
    ],
    generateID: () => createBlockId(),
  }),
];

/**
 * Schema-restricted Tiptap editor for one `rich` field (CG-C5). Uncontrolled
 * after mount — same convention as the textarea stopgap it replaces
 * (`screen-dokumenti.tsx`'s `key={revisionId}`): content loads once from
 * `value`, commits back via `onChange` on blur, and the parent forces a
 * fresh instance with a `key` when a genuinely different document should
 * load. This avoids fighting ProseMirror's own cursor/undo state on every
 * parent re-render.
 */
export function RichTextEditor({
  value,
  onChange,
  readOnly,
  className,
}: {
  value: RichDoc;
  onChange: (next: RichDoc) => void;
  readOnly?: boolean;
  className?: string;
}) {
  const [linkPromptOpen, setLinkPromptOpen] = useState(false);
  const [linkValue, setLinkValue] = useState("");
  const [linkError, setLinkError] = useState<string | null>(null);

  const editor = useEditor({
    extensions: EXTENSIONS,
    content: richDocToTiptapDoc(value),
    editable: !readOnly,
    // Next.js App Router SSR-safety — Tiptap's official recommendation to
    // avoid a hydration mismatch on the initial render.
    immediatelyRender: false,
    onBlur: ({ editor: current }) =>
      onChange(tiptapDocToRichDoc(current.getJSON())),
  });

  useEffect(() => {
    editor?.setEditable(!readOnly);
  }, [editor, readOnly]);

  if (!editor) return null;

  const openLinkPrompt = () => {
    setLinkValue(editor.getAttributes("link").href ?? "");
    setLinkError(null);
    setLinkPromptOpen(true);
  };

  const applyLink = () => {
    const href = linkValue.trim();
    if (!href) {
      editor.chain().focus().unsetLink().run();
      setLinkPromptOpen(false);
      return;
    }
    if (!isAllowedHref(href)) {
      setLinkError(
        "Link nije dozvoljen — koristiti https:// adresu, mailto: ili internu rutu.",
      );
      return;
    }
    editor.chain().focus().setLink({ href }).run();
    setLinkPromptOpen(false);
  };

  return (
    <div className={className}>
      {!readOnly ? (
        <>
          <Toolbar editor={editor} onLinkClick={openLinkPrompt} />
          {linkPromptOpen ? (
            <div className="border-line-strong bg-panel-canvas/50 rounded-tile mb-1.5 flex items-center gap-2 border border-dashed px-2.5 py-2">
              <input
                autoFocus
                value={linkValue}
                onChange={(event) => {
                  setLinkValue(event.target.value);
                  setLinkError(null);
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    applyLink();
                  }
                  if (event.key === "Escape") setLinkPromptOpen(false);
                }}
                placeholder="https://… ili /interna-ruta"
                className="border-line-strong rounded-tile bg-panel-canvas text-coffee focus:border-sage flex-1 border px-2.5 py-1.5 text-[12.5px] outline-none"
              />
              <button
                type="button"
                onClick={applyLink}
                className="bg-forest text-panel-canvas cursor-pointer rounded-full border-0 px-3 py-1.5 text-[12px] font-semibold"
              >
                Primeni
              </button>
              <button
                type="button"
                onClick={() => setLinkPromptOpen(false)}
                className="border-line-strong text-ink-70 cursor-pointer rounded-full border bg-transparent px-3 py-1.5 text-[12px] font-semibold"
              >
                Odustani
              </button>
            </div>
          ) : null}
          {linkError ? (
            <p className="text-danger mb-1.5 text-[12px]">{linkError}</p>
          ) : null}
        </>
      ) : null}
      <EditorContent
        editor={editor}
        className="border-line-strong rounded-tile bg-panel-canvas prose-content min-h-[7rem] border px-3 py-2.5 text-sm read-only:opacity-70"
      />
    </div>
  );
}

function Toolbar({
  editor,
  onLinkClick,
}: {
  editor: Editor;
  onLinkClick: () => void;
}) {
  return (
    <div className="mb-1.5 flex flex-wrap gap-1">
      <ToolbarButton
        active={editor.isActive("heading", { level: 2 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
      >
        H2
      </ToolbarButton>
      <ToolbarButton
        active={editor.isActive("heading", { level: 3 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
      >
        H3
      </ToolbarButton>
      <ToolbarButton
        active={editor.isActive("heading", { level: 4 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 4 }).run()}
      >
        H4
      </ToolbarButton>
      <ToolbarButton
        active={editor.isActive("bulletList")}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      >
        • Lista
      </ToolbarButton>
      <ToolbarButton
        active={editor.isActive("orderedList")}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      >
        1. Lista
      </ToolbarButton>
      <ToolbarButton
        active={editor.isActive("blockquote")}
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
      >
        Citat
      </ToolbarButton>
      <ToolbarButton
        active={editor.isActive("bold")}
        onClick={() => editor.chain().focus().toggleBold().run()}
      >
        <strong>B</strong>
      </ToolbarButton>
      <ToolbarButton
        active={editor.isActive("italic")}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      >
        <em>I</em>
      </ToolbarButton>
      <ToolbarButton
        active={editor.isActive("underline")}
        onClick={() => editor.chain().focus().toggleUnderline().run()}
      >
        <span className="underline">U</span>
      </ToolbarButton>
      <ToolbarButton active={editor.isActive("link")} onClick={onLinkClick}>
        Link
      </ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().undo().run()}>
        ↶
      </ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().redo().run()}>
        ↷
      </ToolbarButton>
    </div>
  );
}

function ToolbarButton({
  active,
  onClick,
  children,
}: {
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`cursor-pointer rounded-full border px-2.5 py-1 text-[12px] font-semibold transition-colors ${
        active
          ? "border-forest bg-forest text-panel-canvas"
          : "border-line-strong text-ink-70 hover:border-coffee/40 bg-transparent"
      }`}
    >
      {children}
    </button>
  );
}
