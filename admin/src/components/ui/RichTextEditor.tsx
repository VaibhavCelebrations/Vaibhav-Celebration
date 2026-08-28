"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Underline from "@tiptap/extension-underline";
import Placeholder from "@tiptap/extension-placeholder";
import TextAlign from "@tiptap/extension-text-align";
import { useCallback, useState } from "react";
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough,
  Heading2, Heading3, List, ListOrdered, Quote, Minus,
  Link2, Image as ImageIcon, AlignLeft, AlignCenter, AlignRight,
  Code, Undo, Redo, X, Link2Off,
} from "lucide-react";
import type { MediaRef } from "@/types/common";
import { MediaPicker } from "./MediaPicker";

type RichTextEditorProps = {
  id?: string;
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: number;
  /** If set, enables the image insertion toolbar button via MediaPicker */
  mediaKind?: Parameters<typeof MediaPicker>[0]["kind"];
};

function ToolbarButton({
  onClick, active = false, disabled = false, title, children,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={`flex h-7 w-7 items-center justify-center rounded transition-colors text-sm cursor-pointer disabled:opacity-30 disabled:cursor-default ${
        active
          ? "bg-mocha text-white"
          : "text-(--color-charcoal) hover:bg-(--color-surface-alt)"
      }`}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <div className="h-5 w-px bg-border-soft mx-0.5 shrink-0" />;
}

export function RichTextEditor({
  id,
  value,
  onChange,
  placeholder = "Start writing…",
  minHeight = 280,
  mediaKind,
}: RichTextEditorProps) {
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkHref, setLinkHref] = useState("");
  const [showImagePicker, setShowImagePicker] = useState(false);
  const [pickedImage, setPickedImage] = useState<MediaRef | null>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3, 4] },
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { rel: "noopener noreferrer" },
      }),
      Image.configure({
        inline: false,
        allowBase64: false,
        HTMLAttributes: { class: "rte-img" },
      }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Placeholder.configure({ placeholder }),
    ],
    content: value,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        id: id ?? "",
        class: "rte-content outline-none",
        style: `min-height: ${minHeight}px;`,
      },
    },
  });

  const applyLink = useCallback(() => {
    if (!editor) return;
    if (!linkHref.trim()) {
      editor.chain().focus().unsetLink().run();
    } else {
      const href = linkHref.startsWith("http") ? linkHref : `https://${linkHref}`;
      editor.chain().focus().setLink({ href }).run();
    }
    setShowLinkInput(false);
    setLinkHref("");
  }, [editor, linkHref]);

  const handleImagePicked = useCallback(
    (media: MediaRef | null) => {
      if (!media || !editor) return;
      editor.chain().focus().setImage({ src: media.url, alt: media.altText ?? "" }).run();
      setPickedImage(null);
      setShowImagePicker(false);
    },
    [editor],
  );

  if (!editor) return null;

  const isLinkActive = editor.isActive("link");

  return (
    <div className="overflow-hidden rounded-md border border-border bg-white" id={id ? `${id}-wrapper` : undefined}>
      {/* ── Toolbar ── */}
      <div
        className="flex flex-wrap items-center gap-0.5 border-b border-border-soft px-2 py-1.5"
        style={{ background: "var(--color-surface)" }}
        onMouseDown={(e) => e.preventDefault()} // prevent editor blur
      >
        {/* Undo / Redo */}
        <ToolbarButton title="Undo" onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()}>
          <Undo size={14} />
        </ToolbarButton>
        <ToolbarButton title="Redo" onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()}>
          <Redo size={14} />
        </ToolbarButton>

        <Divider />

        {/* Headings */}
        <ToolbarButton
          title="Heading 2"
          active={editor.isActive("heading", { level: 2 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        >
          <Heading2 size={14} />
        </ToolbarButton>
        <ToolbarButton
          title="Heading 3"
          active={editor.isActive("heading", { level: 3 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        >
          <Heading3 size={14} />
        </ToolbarButton>

        <Divider />

        {/* Inline formatting */}
        <ToolbarButton title="Bold" active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}>
          <Bold size={13} />
        </ToolbarButton>
        <ToolbarButton title="Italic" active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()}>
          <Italic size={13} />
        </ToolbarButton>
        <ToolbarButton title="Underline" active={editor.isActive("underline")} onClick={() => editor.chain().focus().toggleUnderline().run()}>
          <UnderlineIcon size={13} />
        </ToolbarButton>
        <ToolbarButton title="Strikethrough" active={editor.isActive("strike")} onClick={() => editor.chain().focus().toggleStrike().run()}>
          <Strikethrough size={13} />
        </ToolbarButton>
        <ToolbarButton title="Inline code" active={editor.isActive("code")} onClick={() => editor.chain().focus().toggleCode().run()}>
          <Code size={13} />
        </ToolbarButton>

        <Divider />

        {/* Lists */}
        <ToolbarButton title="Bullet list" active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()}>
          <List size={14} />
        </ToolbarButton>
        <ToolbarButton title="Numbered list" active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
          <ListOrdered size={14} />
        </ToolbarButton>
        <ToolbarButton title="Blockquote" active={editor.isActive("blockquote")} onClick={() => editor.chain().focus().toggleBlockquote().run()}>
          <Quote size={14} />
        </ToolbarButton>
        <ToolbarButton title="Divider line" onClick={() => editor.chain().focus().setHorizontalRule().run()}>
          <Minus size={14} />
        </ToolbarButton>

        <Divider />

        {/* Alignment */}
        <ToolbarButton title="Align left" active={editor.isActive({ textAlign: "left" })} onClick={() => editor.chain().focus().setTextAlign("left").run()}>
          <AlignLeft size={13} />
        </ToolbarButton>
        <ToolbarButton title="Align center" active={editor.isActive({ textAlign: "center" })} onClick={() => editor.chain().focus().setTextAlign("center").run()}>
          <AlignCenter size={13} />
        </ToolbarButton>
        <ToolbarButton title="Align right" active={editor.isActive({ textAlign: "right" })} onClick={() => editor.chain().focus().setTextAlign("right").run()}>
          <AlignRight size={13} />
        </ToolbarButton>

        <Divider />

        {/* Link */}
        <ToolbarButton
          title={isLinkActive ? "Edit link" : "Add link"}
          active={isLinkActive}
          onClick={() => {
            if (isLinkActive) {
              setLinkHref(editor.getAttributes("link").href ?? "");
            } else {
              setLinkHref("");
            }
            setShowLinkInput((v) => !v);
          }}
        >
          <Link2 size={13} />
        </ToolbarButton>
        {isLinkActive && (
          <ToolbarButton title="Remove link" onClick={() => editor.chain().focus().unsetLink().run()}>
            <Link2Off size={13} />
          </ToolbarButton>
        )}

        {/* Image (optional) */}
        {mediaKind && (
          <>
            <Divider />
            <ToolbarButton title="Insert image" onClick={() => setShowImagePicker(true)}>
              <ImageIcon size={14} />
            </ToolbarButton>
          </>
        )}
      </div>

      {/* ── Link input bar ── */}
      {showLinkInput && (
        <div
          className="flex items-center gap-2 border-b border-border-soft px-3 py-2"
          style={{ background: "var(--color-cream)" }}
          onMouseDown={(e) => e.preventDefault()}
        >
          <Link2 size={13} className="text-(--color-text-muted) shrink-0" />
          <input
            type="url"
            autoFocus
            value={linkHref}
            onChange={(e) => setLinkHref(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") { e.preventDefault(); applyLink(); }
              if (e.key === "Escape") setShowLinkInput(false);
            }}
            placeholder="https://example.com"
            className="flex-1 bg-transparent text-sm outline-none text-(--color-charcoal) placeholder:text-(--color-text-muted)"
          />
          <button
            type="button"
            onClick={applyLink}
            className="btn btn-primary px-3 py-1 text-xs"
          >
            Apply
          </button>
          <button
            type="button"
            onClick={() => setShowLinkInput(false)}
            className="text-(--color-text-muted) hover:text-(--color-charcoal)"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* ── Hidden MediaPicker trigger ── */}
      {mediaKind && (
        <div className="hidden">
          <MediaPicker
            kind={mediaKind}
            value={pickedImage}
            onChange={handleImagePicked}
          />
        </div>
      )}

      {/* ── Image picker modal (programmatic open via showImagePicker state) ── */}
      {mediaKind && showImagePicker && (
        <ImagePickerOverlay
          kind={mediaKind}
          onPick={handleImagePicked}
          onClose={() => setShowImagePicker(false)}
        />
      )}

      {/* ── Editor area ── */}
      <div className="px-4 py-3">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}

/**
 * Inline overlay that renders MediaPicker in an open state.
 * We can't directly call setOpen on MediaPicker so we mount it
 * and immediately programmatically open the native file-pick flow.
 */
function ImagePickerOverlay({
  kind,
  onPick,
  onClose,
}: {
  kind: Parameters<typeof MediaPicker>[0]["kind"];
  onPick: (media: MediaRef | null) => void;
  onClose: () => void;
}) {
  const handleChange = (media: MediaRef | null) => {
    onPick(media);
    onClose();
  };

  return (
    // Render the picker button in an open-forced state by simulating open
    <div className="fixed inset-0 z-200 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border-soft">
          <div>
            <h3 className="font-serif text-lg">Insert Image</h3>
            <p className="text-xs text-(--color-text-muted)">Select or upload an image to embed in the editor.</p>
          </div>
          <button type="button" onClick={onClose} className="cursor-pointer rounded-lg p-1.5 hover:bg-(--color-surface-alt)">
            <X size={18} />
          </button>
        </div>
        {/* Force MediaPicker into its open dialog view by rendering it then auto-opening */}
        <div className="p-4">
          <MediaPickerInline kind={kind} onChange={handleChange} onCancel={onClose} />
        </div>
      </div>
    </div>
  );
}

/** Inline version of media library grid without the trigger button */
function MediaPickerInline({
  kind,
  onChange,
  onCancel,
}: {
  kind: Parameters<typeof MediaPicker>[0]["kind"];
  onChange: (media: MediaRef | null) => void;
  onCancel: () => void;
}) {
  // We reuse MediaPicker but need its open state. The cleanest approach:
  // render it with a forced open-like container using a hidden button approach.
  // We'll just show MediaPicker directly in open state by rendering
  // it as a button that auto-clicks, but since MediaPicker manages its own state
  // the simplest approach is to use the actual component and simulate.
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-(--color-text-muted)">Click an image below to insert it, or upload a new one.</p>
      <MediaPickerGrid kind={kind} onChange={onChange} />
      <div className="flex justify-end">
        <button type="button" onClick={onCancel} className="btn btn-ghost px-4 py-2 text-sm">
          Cancel
        </button>
      </div>
    </div>
  );
}

/** Standalone grid-only media picker (no portal, inline rendering) */
function MediaPickerGrid({
  kind,
  onChange,
}: {
  kind: Parameters<typeof MediaPicker>[0]["kind"];
  onChange: (media: MediaRef | null) => void;
}) {
  const [items, setItems] = useState<MediaRef[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [uploading, setUploading] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [altDraft, setAltDraft] = useState("");
  const [showAltPrompt, setShowAltPrompt] = useState(false);

  const API_BASE =
    typeof window !== "undefined"
      ? (process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000/api/v1")
      : "http://localhost:4000/api/v1";

  function getAuthHeaders(): Record<string, string> {
    if (typeof window === "undefined") return {};
    const token = window.localStorage.getItem("vbc_admin_access");
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: "1", pageSize: "60", category: kind });
      if (search.trim()) params.set("search", search.trim());
      const res = await fetch(`${API_BASE}/admin/media?${params}`, {
        credentials: "include",
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error("Failed to load media");
      const data = await res.json() as { data: { items: MediaRef[] } };
      setItems(data.data?.items ?? []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind, search]);

  // Load on mount and search change
  useState(() => { void load(); });

  const confirmUpload = async () => {
    if (!pendingFile || !altDraft.trim()) return;
    setUploading(true);
    setShowAltPrompt(false);
    try {
      const form = new FormData();
      form.append("file", pendingFile);
      form.append("kind", kind);
      form.append("scope", "general");
      form.append("role", "photo");
      form.append("category", kind);
      form.append("altText", altDraft.trim());

      const res = await fetch(`${API_BASE}/admin/media/upload`, {
        method: "POST",
        credentials: "include",
        headers: getAuthHeaders(),
        body: form,
      });
      if (!res.ok) throw new Error("Upload failed");
      const completeResJson = await res.json() as ApiSuccess<MediaRef>;
      onChange(completeResJson.data);
    } catch (e) {
      console.error("Upload failed", e);
    } finally {
      setUploading(false);
      setPendingFile(null);
    }
  };

  return (
    <div className="flex flex-col gap-3 flex-1 min-h-0">
      {/* Alt text prompt */}
      {showAltPrompt && pendingFile && (
        <div className="rounded-xl border border-border p-4 bg-(--color-cream) flex flex-col gap-2">
          <p className="text-sm font-medium">Add ALT text for <strong>{pendingFile.name}</strong></p>
          <textarea
            className="input w-full resize-none text-sm"
            rows={2}
            placeholder="Describe the image for SEO and accessibility…"
            value={altDraft}
            onChange={(e) => setAltDraft(e.target.value)}
            maxLength={250}
            autoFocus
          />
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={() => { setShowAltPrompt(false); setPendingFile(null); }} className="btn btn-ghost px-3 py-1.5 text-xs">Cancel</button>
            <button type="button" onClick={confirmUpload} disabled={!altDraft.trim()} className="btn btn-primary px-3 py-1.5 text-xs disabled:opacity-50">
              {uploading ? "Uploading…" : "Upload"}
            </button>
          </div>
        </div>
      )}

      {/* Toolbar row */}
      <div className="flex items-center gap-2">
        <label className="btn btn-primary px-3 py-1.5 text-xs cursor-pointer">
          <input
            type="file"
            className="hidden"
            accept="image/*"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) { setPendingFile(file); setAltDraft(""); setShowAltPrompt(true); }
              e.target.value = "";
            }}
          />
          Upload new
        </label>
        <input
          type="text"
          placeholder="Search…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 input text-sm py-1.5"
        />
        <button type="button" onClick={() => void load()} className="btn btn-ghost px-3 py-1.5 text-xs">Refresh</button>
      </div>

      {/* Grid */}
      <div className="overflow-y-auto max-h-100">
        {loading ? (
          <div className="grid grid-cols-4 gap-2">
            {Array.from({ length: 8 }).map((_, i) => <div key={i} className="skeleton aspect-video rounded-lg" />)}
          </div>
        ) : items.length === 0 ? (
          <p className="text-center text-sm text-(--color-text-muted) py-8">No media found. Upload the first image.</p>
        ) : (
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
            {items.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onChange(item)}
                className="group overflow-hidden rounded-lg border border-border-soft hover:border-mocha hover:shadow-md transition-all cursor-pointer"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={item.url} alt={item.altText ?? ""} className="aspect-video w-full object-cover group-hover:scale-105 transition-transform duration-200" loading="lazy" />
                <p className="p-1.5 text-[10px] truncate text-(--color-text-muted)">{item.altText || "—"}</p>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
