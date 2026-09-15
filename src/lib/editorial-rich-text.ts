export type EditorialRichTextDocument = {
  type: "doc";
  content: EditorialRichTextNode[];
};

export type EditorialRichTextNode = {
  type: string;
  attrs?: Record<string, unknown>;
  content?: EditorialRichTextNode[];
  text?: string;
  marks?: EditorialRichTextMark[];
};

export type EditorialRichTextMark = {
  type: "bold" | "italic" | "strike" | "code" | "link";
  attrs?: Record<string, unknown>;
};

const blockTypes = new Set(["paragraph", "heading", "bulletList", "orderedList", "listItem", "blockquote", "codeBlock", "horizontalRule"]);
const markTypes = new Set(["bold", "italic", "strike", "code", "link"]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

export function safeEditorialHref(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const href = value.trim();
  if (!href || href.length > 2_000 || /[\u0000-\u001f\u007f]/.test(href)) return undefined;
  if (href.startsWith("/") && !href.startsWith("//")) return href;
  if (href.startsWith("#")) return href;
  try {
    const url = new URL(href);
    return ["http:", "https:", "mailto:", "tel:"].includes(url.protocol) ? href : undefined;
  } catch {
    return undefined;
  }
}

function sanitizeMarks(value: unknown): EditorialRichTextMark[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const marks = value.flatMap((entry) => {
    if (!isRecord(entry) || typeof entry.type !== "string" || !markTypes.has(entry.type)) return [];
    if (entry.type === "link") {
      const href = safeEditorialHref(isRecord(entry.attrs) ? entry.attrs.href : undefined);
      return href ? [{ type: "link" as const, attrs: { href } }] : [];
    }
    return [{ type: entry.type as EditorialRichTextMark["type"] }];
  });
  return marks.length ? marks : undefined;
}

function sanitizeNode(value: unknown, parentType?: string): EditorialRichTextNode | undefined {
  if (!isRecord(value) || typeof value.type !== "string") return undefined;
  const type = value.type;
  if (type === "text") {
    if (typeof value.text !== "string" || !value.text) return undefined;
    const text: EditorialRichTextNode = { type, text: value.text.slice(0, 50_000) };
    const marks = sanitizeMarks(value.marks);
    if (marks) text.marks = marks;
    return text;
  }
  if (type === "hardBreak") return { type };
  if (!blockTypes.has(type) || (parentType && !["doc", "bulletList", "orderedList", "listItem", "blockquote"].includes(parentType))) return undefined;
  const node: EditorialRichTextNode = { type };
  if (type === "heading") {
    const level = isRecord(value.attrs) && typeof value.attrs.level === "number" && [2, 3].includes(value.attrs.level) ? value.attrs.level : 2;
    node.attrs = { level };
  }
  if (type === "orderedList" && isRecord(value.attrs) && typeof value.attrs.start === "number" && Number.isInteger(value.attrs.start)) node.attrs = { start: Math.max(1, Math.min(value.attrs.start, 1_000)) };
  if (type === "codeBlock" && isRecord(value.attrs) && typeof value.attrs.language === "string" && value.attrs.language.length <= 40) node.attrs = { language: value.attrs.language };
  const childParent = type;
  if (Array.isArray(value.content)) {
    const content = value.content.flatMap((child) => {
      const sanitized = sanitizeNode(child, childParent);
      return sanitized ? [sanitized] : [];
    });
    if (content.length) node.content = content;
  }
  return node;
}

export function sanitizeEditorialRichText(value: unknown): EditorialRichTextDocument | undefined {
  if (!isRecord(value) || value.type !== "doc" || !Array.isArray(value.content)) return undefined;
  const content = value.content.flatMap((node) => {
    const sanitized = sanitizeNode(node, "doc");
    return sanitized ? [sanitized] : [];
  });
  return { type: "doc", content };
}

function nodeText(node: EditorialRichTextNode): string {
  if (node.type === "hardBreak") return "\n";
  if (node.type === "text") return node.text ?? "";
  return (node.content ?? []).map(nodeText).join(["bulletList", "orderedList", "listItem"].includes(node.type) ? "\n" : "");
}

export function editorialRichTextToPlainText(value: unknown): string[] {
  const document = sanitizeEditorialRichText(value);
  if (!document) return [];
  return document.content.flatMap((node) => {
    const text = nodeText(node).replace(/[ \t]+\n/g, "\n").trim();
    return text ? [text] : [];
  });
}

export function isMarkdownLike(value: string): boolean {
  return /(^|\n)\s*(#{2,3}\s|[-*+•]\s|\d+\\?[.)]\s|>\s|```|---+\s*$)/m.test(value) || /\\?\*\\?\*.+?\\?\*\\?\*|`[^`]+`|\[[^\]]+\]\([^)]+\)/.test(value);
}

function inlineMarkdown(value: string): EditorialRichTextNode[] {
  const result: EditorialRichTextNode[] = [];
  let rest = value;
  const pattern = /\[([^\]]+)\]\(([^)]+)\)|`([^`]+)`|\*\*([^*]+)\*\*|__([^_]+)__|\*([^*]+)\*|_([^_]+)_/;
  while (rest) {
    const match = pattern.exec(rest);
    if (!match) {
      result.push({ type: "text", text: rest });
      break;
    }
    if (match.index > 0) result.push({ type: "text", text: rest.slice(0, match.index) });
    if (match[1] && safeEditorialHref(match[2])) result.push({ type: "text", text: match[1], marks: [{ type: "link", attrs: { href: safeEditorialHref(match[2]) } }] });
    else if (match[3]) result.push({ type: "text", text: match[3], marks: [{ type: "code" }] });
    else if (match[4] || match[5]) result.push({ type: "text", text: match[4] ?? match[5] ?? "", marks: [{ type: "bold" }] });
    else result.push({ type: "text", text: match[6] ?? match[7] ?? "", marks: [{ type: "italic" }] });
    rest = rest.slice(match.index + match[0].length);
  }
  return result;
}

export function markdownToEditorialRichText(markdown: string): EditorialRichTextDocument {
  const lines = markdown.replace(/\r\n?/g, "\n").replace(/\\([*_`#[\]().!>+\-])/g, "$1").split("\n");
  const content: EditorialRichTextNode[] = [];
  let paragraph: string[] = [];
  let list: EditorialRichTextNode | undefined;
  let listType: "bulletList" | "orderedList" | undefined;
  let code: string[] | undefined;
  let codeLanguage = "";
  const flushParagraph = () => { if (paragraph.length) { content.push({ type: "paragraph", content: paragraph.flatMap((line, index) => index ? [{ type: "hardBreak" as const }, ...inlineMarkdown(line)] : inlineMarkdown(line)) }); paragraph = []; } };
  const flushList = () => { if (list) content.push(list); list = undefined; listType = undefined; };
  const flushCode = () => { if (code) content.push({ type: "codeBlock", ...(codeLanguage ? { attrs: { language: codeLanguage } } : {}), content: code.length ? [{ type: "text", text: code.join("\n") }] : undefined }); code = undefined; codeLanguage = ""; };
  for (const line of lines) {
    const fence = line.match(/^\s*```\s*([\w+-]*)\s*$/);
    if (fence) { if (code) flushCode(); else { flushParagraph(); flushList(); code = []; codeLanguage = fence[1] ?? ""; } continue; }
    if (code) { code.push(line); continue; }
    const heading = line.match(/^\s*(#{2,3})\s+(.+?)\s*$/);
    const strongHeading = line.match(/^\s*\*\*(.+?)\*\*[:：]?\s*$/);
    const bullet = line.match(/^\s*[-*+•]\s+(.+?)\s*$/);
    const ordered = line.match(/^\s*(\d+)[.)]\s+(.+?)\s*$/);
    const quote = line.match(/^\s*>\s?(.*?)\s*$/);
    if (!line.trim()) { flushParagraph(); continue; }
    if (heading) { flushParagraph(); flushList(); content.push({ type: "heading", attrs: { level: heading[1].length }, content: inlineMarkdown(heading[2]) }); continue; }
    if (strongHeading) { flushParagraph(); flushList(); const level = /^[一二三四五六七八九十]+[、.]/.test(strongHeading[1]) ? 2 : 3; content.push({ type: "heading", attrs: { level }, content: inlineMarkdown(strongHeading[1]) }); continue; }
    if (bullet || ordered) {
      flushParagraph();
      if (bullet && listType === "orderedList" && list?.content?.length) {
        const lastItem = list.content[list.content.length - 1];
        let nestedList = lastItem.content?.find((node) => node.type === "bulletList");
        if (!nestedList) { nestedList = { type: "bulletList", content: [] }; lastItem.content = [...(lastItem.content ?? []), nestedList]; }
        nestedList.content!.push({ type: "listItem", content: [{ type: "paragraph", content: inlineMarkdown(bullet[1]) }] });
        continue;
      }
      const nextType = bullet ? "bulletList" : "orderedList";
      if (listType !== nextType) { flushList(); listType = nextType; list = { type: nextType, ...(ordered ? { attrs: { start: Number(ordered[1]) } } : {}), content: [] }; }
      list!.content!.push({ type: "listItem", content: [{ type: "paragraph", content: inlineMarkdown(bullet?.[1] ?? ordered![2]) }] }); continue;
    }
    if (quote) { flushParagraph(); flushList(); content.push({ type: "blockquote", content: [{ type: "paragraph", content: inlineMarkdown(quote[1]) }] }); continue; }
    if (/^\s*([-*_])(?:\s*\1){2,}\s*$/.test(line)) { flushParagraph(); flushList(); content.push({ type: "horizontalRule" }); continue; }
    flushList(); paragraph.push(line.trim());
  }
  if (code) flushCode(); else { flushParagraph(); flushList(); }
  return { type: "doc", content };
}
