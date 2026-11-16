"use client";

import { useId, useRef, useState } from "react";
import type { Editor } from "@tiptap/core";
import { useEditor, EditorContent, type JSONContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { BoldIcon, Code2Icon, Heading2Icon, Heading3Icon, ItalicIcon, LinkIcon, ListIcon, ListOrderedIcon, MinusIcon, QuoteIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { isMarkdownLike, markdownToEditorialRichText, safeEditorialHref } from "@/lib/editorial-rich-text";

const emptyDocument: JSONContent = { type: "doc", content: [{ type: "paragraph" }] };

export function RichTextEditor({ name, label, initialContent }: { name: string; label: string; initialContent?: JSONContent }) {
  const editorId = useId();
  const startingContent = initialContent ?? emptyDocument;
  const [serialized, setSerialized] = useState(() => JSON.stringify(startingContent));
  const editorRef = useRef<Editor | null>(null);
  const editor = useEditor({
    extensions: [StarterKit.configure({ link: { openOnClick: false, HTMLAttributes: { rel: "noopener noreferrer" } } })],
    content: startingContent,
    immediatelyRender: false,
    editorProps: {
      attributes: { id: editorId, "aria-label": label },
      handlePaste: (_view, event) => {
        const text = event.clipboardData?.getData("text/plain") ?? "";
        if (!text || !isMarkdownLike(text) || !editorRef.current) return false;
        event.preventDefault();
        editorRef.current.chain().focus().insertContent(markdownToEditorialRichText(text).content).run();
        return true;
      },
    },
    onCreate: ({ editor: currentEditor }) => { editorRef.current = currentEditor; },
    onUpdate: ({ editor: currentEditor }) => setSerialized(JSON.stringify(currentEditor.getJSON())),
  });
  return <div className="flex flex-col gap-2"><label className="text-sm font-medium" htmlFor={editorId}>{label}</label><div className="rounded-lg border bg-background"><div className="flex flex-wrap gap-1 border-b p-2" role="toolbar" aria-label={`${label}格式`}>
    <Button type="button" variant="ghost" size="icon-sm" aria-label="粗体" aria-pressed={editor?.isActive("bold") ?? false} onClick={() => editor?.chain().focus().toggleBold().run()}><BoldIcon /></Button>
    <Button type="button" variant="ghost" size="icon-sm" aria-label="斜体" aria-pressed={editor?.isActive("italic") ?? false} onClick={() => editor?.chain().focus().toggleItalic().run()}><ItalicIcon /></Button>
    <Button type="button" variant="ghost" size="icon-sm" aria-label="二级标题" aria-pressed={editor?.isActive("heading", { level: 2 }) ?? false} onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}><Heading2Icon /></Button>
    <Button type="button" variant="ghost" size="icon-sm" aria-label="三级标题" aria-pressed={editor?.isActive("heading", { level: 3 }) ?? false} onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}><Heading3Icon /></Button>
    <Button type="button" variant="ghost" size="icon-sm" aria-label="项目列表" aria-pressed={editor?.isActive("bulletList") ?? false} onClick={() => editor?.chain().focus().toggleBulletList().run()}><ListIcon /></Button>
    <Button type="button" variant="ghost" size="icon-sm" aria-label="编号列表" aria-pressed={editor?.isActive("orderedList") ?? false} onClick={() => editor?.chain().focus().toggleOrderedList().run()}><ListOrderedIcon /></Button>
    <Button type="button" variant="ghost" size="icon-sm" aria-label="引用" aria-pressed={editor?.isActive("blockquote") ?? false} onClick={() => editor?.chain().focus().toggleBlockquote().run()}><QuoteIcon /></Button>
    <Button type="button" variant="ghost" size="icon-sm" aria-label="代码" aria-pressed={editor?.isActive("code") ?? false} onClick={() => editor?.chain().focus().toggleCode().run()}><Code2Icon /></Button>
    <Button type="button" variant="ghost" size="icon-sm" aria-label="代码块" aria-pressed={editor?.isActive("codeBlock") ?? false} onClick={() => editor?.chain().focus().toggleCodeBlock().run()}><Code2Icon className="opacity-60" /></Button>
    <Button type="button" variant="ghost" size="icon-sm" aria-label="分割线" onClick={() => editor?.chain().focus().setHorizontalRule().run()}><MinusIcon /></Button>
    <Button type="button" variant="ghost" size="icon-sm" aria-label="插入链接" aria-pressed={editor?.isActive("link") ?? false} onClick={() => { if (!editor) return; if (editor.isActive("link")) { editor.chain().focus().unsetLink().run(); return; } const href = safeEditorialHref(window.prompt("请输入链接地址")); if (href) editor.chain().focus().setLink({ href }).run(); }}><LinkIcon /></Button>
  </div><EditorContent editor={editor} className="min-h-48 p-4 [&_.tiptap]:min-h-40 [&_.tiptap]:outline-none [&_.tiptap_h2]:my-3 [&_.tiptap_h2]:text-xl [&_.tiptap_h3]:my-2 [&_.tiptap_h3]:text-lg [&_.tiptap_p]:my-2 [&_.tiptap_ul]:list-disc [&_.tiptap_ul]:pl-6 [&_.tiptap_ol]:list-decimal [&_.tiptap_ol]:pl-6 [&_.tiptap_blockquote]:border-l-2 [&_.tiptap_blockquote]:pl-4 [&_.tiptap_pre]:overflow-x-auto [&_.tiptap_pre]:rounded [&_.tiptap_pre]:bg-muted [&_.tiptap_pre]:p-3" /><input type="hidden" name={name} value={serialized} /></div></div>;
}
