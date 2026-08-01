"use client";

import Blockquote from "@tiptap/extension-blockquote";
import { ListItem } from "@tiptap/extension-list";
import UniqueID from "@tiptap/extension-unique-id";
import {
  EditorContent,
  useEditor,
  useEditorState,
  type Editor,
} from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useEffect, useRef, useState } from "react";

import { normalizeRichHtml } from "@/features/workspace/content-api";
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
  const [pasteStatus, setPasteStatus] = useState<
    "idle" | "normalizing" | "normalized" | "fallback"
  >("idle");
  const editorRef = useRef<Editor | null>(null);

  const editor = useEditor({
    extensions: EXTENSIONS,
    content: richDocToTiptapDoc(value),
    editable: !readOnly,
    // Next.js App Router SSR-safety — Tiptap's official recommendation to
    // avoid a hydration mismatch on the initial render.
    immediatelyRender: false,
    onCreate: ({ editor: current }) => {
      editorRef.current = current;
    },
    onDestroy: () => {
      editorRef.current = null;
    },
    editorProps: {
      attributes: {
        "aria-label": "Sadržaj dokumenta",
        "aria-multiline": "true",
        class: "rich-text-editor-document",
        role: "textbox",
        spellcheck: "true",
      },
      handlePaste: (_view, event) => {
        const html = event.clipboardData?.getData("text/html") ?? "";
        if (!html.trim()) return false;

        const plainText = event.clipboardData?.getData("text/plain") ?? "";
        event.preventDefault();
        setPasteStatus("normalizing");
        void normalizeRichHtml(html)
          .then((result) => {
            const current = editorRef.current;
            if (!current) return;
            const normalized = richDocToTiptapDoc(result.body).content ?? [];
            current.chain().focus().insertContent(normalized).run();
            setPasteStatus("normalized");
          })
          .catch(() => {
            const current = editorRef.current;
            if (!current) return;
            current.chain().focus().insertContent(plainText).run();
            setPasteStatus("fallback");
          });
        return true;
      },
    },
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
        onMouseDown={(event) => {
          if (readOnly || event.target !== event.currentTarget) return;
          event.preventDefault();
          editor.chain().focus("end").run();
        }}
        className={`rich-text-editor-surface border-line-strong focus-within:border-sage focus-within:ring-sage/20 rounded-tile bg-panel-canvas max-h-[500px] min-h-[12rem] cursor-text overflow-y-auto border px-4 py-3 pr-2 transition-shadow focus-within:ring-2 ${
          readOnly ? "cursor-default opacity-70" : ""
        }`}
      />
      <p
        className="text-ink-55 mt-1.5 min-h-4 text-[11.5px]"
        aria-live="polite"
      >
        {pasteStatus === "normalizing"
          ? "Normalizujem nalepljeni sadržaj…"
          : pasteStatus === "normalized"
            ? "Nalepljeni sadržaj je bezbedno normalizovan."
            : pasteStatus === "fallback"
              ? "Normalizator nije dostupan; nalepljen je samo običan tekst."
              : null}
      </p>
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
  const active = useEditorState({
    editor,
    selector: ({ editor: current }) => ({
      blockquote: current.isActive("blockquote"),
      bold: current.isActive("bold"),
      bulletList: current.isActive("bulletList"),
      canRedo: current.can().redo(),
      canUndo: current.can().undo(),
      heading2: current.isActive("heading", { level: 2 }),
      heading3: current.isActive("heading", { level: 3 }),
      heading4: current.isActive("heading", { level: 4 }),
      italic: current.isActive("italic"),
      link: current.isActive("link"),
      orderedList: current.isActive("orderedList"),
      paragraph: current.isActive("paragraph"),
      underline: current.isActive("underline"),
    }),
  });

  return (
    <div
      className="mb-1.5 flex flex-wrap gap-1"
      role="toolbar"
      aria-label="Formatiranje sadržaja"
    >
      <ToolbarButton
        active={active.paragraph}
        onClick={() => editor.chain().focus().setParagraph().run()}
      >
        P
      </ToolbarButton>
      <ToolbarButton
        active={active.heading2}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
      >
        H2
      </ToolbarButton>
      <ToolbarButton
        active={active.heading3}
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
      >
        H3
      </ToolbarButton>
      <ToolbarButton
        active={active.heading4}
        onClick={() => editor.chain().focus().toggleHeading({ level: 4 }).run()}
      >
        H4
      </ToolbarButton>
      <ToolbarButton
        active={active.bulletList}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      >
        • Lista
      </ToolbarButton>
      <ToolbarButton
        active={active.orderedList}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      >
        1. Lista
      </ToolbarButton>
      <ToolbarButton
        active={active.blockquote}
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
      >
        Citat
      </ToolbarButton>
      <ToolbarButton
        active={active.bold}
        onClick={() => editor.chain().focus().toggleBold().run()}
      >
        <strong>B</strong>
      </ToolbarButton>
      <ToolbarButton
        active={active.italic}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      >
        <em>I</em>
      </ToolbarButton>
      <ToolbarButton
        active={active.underline}
        onClick={() => editor.chain().focus().toggleUnderline().run()}
      >
        <span className="underline">U</span>
      </ToolbarButton>
      <ToolbarButton active={active.link} onClick={onLinkClick}>
        Link
      </ToolbarButton>
      <ToolbarButton
        disabled={!active.canUndo}
        onClick={() => editor.chain().focus().undo().run()}
      >
        ↶
      </ToolbarButton>
      <ToolbarButton
        disabled={!active.canRedo}
        onClick={() => editor.chain().focus().redo().run()}
      >
        ↷
      </ToolbarButton>
    </div>
  );
}

function ToolbarButton({
  active,
  disabled,
  onClick,
  children,
}: {
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active === undefined ? undefined : active}
      disabled={disabled}
      onClick={onClick}
      className={`focus-visible:ring-forest/30 cursor-pointer rounded-full border px-2.5 py-1 text-[12px] font-semibold transition-colors outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-35 ${
        active
          ? "border-forest bg-forest text-panel-canvas"
          : "border-line-strong text-ink-70 hover:border-coffee/40 bg-transparent"
      }`}
    >
      {children}
    </button>
  );
}
