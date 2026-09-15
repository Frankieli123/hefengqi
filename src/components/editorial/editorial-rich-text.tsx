import { Fragment, type ReactNode } from "react";
import type { EditorialRichTextDocument, EditorialRichTextMark, EditorialRichTextNode } from "@/lib/editorial-rich-text";

function renderMarks(content: ReactNode, marks: EditorialRichTextMark[] | undefined, key: string): ReactNode {
  return marks?.reduce<ReactNode>((current, mark, index) => {
    const markKey = `${key}-mark-${index}`;
    if (mark.type === "bold") return <strong key={markKey}>{current}</strong>;
    if (mark.type === "italic") return <em key={markKey}>{current}</em>;
    if (mark.type === "strike") return <s key={markKey}>{current}</s>;
    if (mark.type === "code") return <code key={markKey}>{current}</code>;
    if (mark.type === "link" && typeof mark.attrs?.href === "string") return <a key={markKey} href={mark.attrs.href}>{current}</a>;
    return current;
  }, content) ?? content;
}

function renderChildren(node: EditorialRichTextNode, key: string) {
  return node.content?.map((child, index) => renderNode(child, `${key}-${index}`));
}

function renderNode(node: EditorialRichTextNode, key: string): ReactNode {
  if (node.type === "text") return <Fragment key={key}>{renderMarks(node.text ?? "", node.marks, key)}</Fragment>;
  if (node.type === "hardBreak") return <br key={key} />;
  if (node.type === "paragraph") return <p key={key}>{renderChildren(node, key)}</p>;
  if (node.type === "heading") {
    const children = renderChildren(node, key);
    return node.attrs?.level === 3 ? <h3 key={key}>{children}</h3> : <h2 key={key}>{children}</h2>;
  }
  if (node.type === "bulletList") return <ul key={key}>{renderChildren(node, key)}</ul>;
  if (node.type === "orderedList") return <ol key={key} start={typeof node.attrs?.start === "number" ? node.attrs.start : undefined}>{renderChildren(node, key)}</ol>;
  if (node.type === "listItem") return <li key={key}>{renderChildren(node, key)}</li>;
  if (node.type === "blockquote") return <blockquote key={key}>{renderChildren(node, key)}</blockquote>;
  if (node.type === "codeBlock") return <pre key={key}><code data-language={typeof node.attrs?.language === "string" ? node.attrs.language : undefined}>{renderChildren(node, key)}</code></pre>;
  if (node.type === "horizontalRule") return <hr key={key} />;
  return null;
}

export function EditorialRichText({ document, fallback }: { document?: EditorialRichTextDocument; fallback: string[] }) {
  if (!document) return <>{fallback.map((paragraph, index) => <p key={`${index}-${paragraph}`}>{paragraph}</p>)}</>;
  return <>{document.content.map((node, index) => renderNode(node, `rich-text-${index}`))}</>;
}
