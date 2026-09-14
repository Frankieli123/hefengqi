"use client";

import { useId, useState } from "react";
import { useEditor, EditorContent, type JSONContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { BoldIcon, Heading2Icon, ItalicIcon, ListIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

const emptyDocument: JSONContent = { type: "doc", content: [{ type: "paragraph" }] };

export function RichTextEditor({ name, label, initialContent }: { name: string; label: string; initialContent?: JSONContent }) {
  const editorId = useId();
  const startingContent = initialContent ?? emptyDocument;
  const [serialized, setSerialized] = useState(() => JSON.stringify(startingContent));
  const editor = useEditor({
    extensions: [StarterKit.configure({ link: { openOnClick: false, HTMLAttributes: { rel: "noopener noreferrer" } } })],
    content: startingContent,
    immediatelyRender: false,
    editorProps: { attributes: { id: editorId, "aria-label": label } },
    onUpdate: ({ editor: currentEditor }) => setSerialized(JSON.stringify(currentEditor.getJSON())),
  });
  return <div className="flex flex-col gap-2"><label className="text-sm font-medium" htmlFor={editorId}>{label}</label><div className="rounded-lg border bg-background"><div className="flex gap-1 border-b p-2" role="toolbar" aria-label={`${label}格式`}><Button type="button" variant="ghost" size="icon-sm" aria-label="粗体" aria-pressed={editor?.isActive("bold") ?? false} onClick={() => editor?.chain().focus().toggleBold().run()}><BoldIcon /></Button><Button type="button" variant="ghost" size="icon-sm" aria-label="斜体" aria-pressed={editor?.isActive("italic") ?? false} onClick={() => editor?.chain().focus().toggleItalic().run()}><ItalicIcon /></Button><Button type="button" variant="ghost" size="icon-sm" aria-label="二级标题" aria-pressed={editor?.isActive("heading", { level: 2 }) ?? false} onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}><Heading2Icon /></Button><Button type="button" variant="ghost" size="icon-sm" aria-label="项目列表" aria-pressed={editor?.isActive("bulletList") ?? false} onClick={() => editor?.chain().focus().toggleBulletList().run()}><ListIcon /></Button></div><EditorContent editor={editor} className="min-h-48 p-4 [&_.tiptap]:min-h-40 [&_.tiptap]:outline-none [&_.tiptap_h2]:my-3 [&_.tiptap_h2]:text-xl [&_.tiptap_p]:my-2 [&_.tiptap_ul]:list-disc [&_.tiptap_ul]:pl-6" /><input type="hidden" name={name} value={serialized} /></div></div>;
}
