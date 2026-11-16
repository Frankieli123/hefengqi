import { describe, expect, it } from "vitest";
import { editorialRichTextToPlainText, isMarkdownLike, markdownToEditorialRichText, sanitizeEditorialRichText } from "@/lib/editorial-rich-text";

describe("editorial rich text", () => {
  it("converts pasted technical Markdown into semantic blocks", () => {
    const markdown = String.raw`\*\*一、 引脚定义\*\*

1\. 检查绝缘
• 核对万用表档位
2\. 确认型号

## 信号定义

• **CAN_H**：总线高电平

发送 \`0x1081407F\` 帧。`;
    expect(isMarkdownLike(markdown)).toBe(true);
    const document = markdownToEditorialRichText(markdown);
    expect(document.content.map((node) => node.type)).toEqual(["heading", "orderedList", "heading", "bulletList", "paragraph"]);
    expect(document.content[0]).toMatchObject({ type: "heading", attrs: { level: 2 } });
    expect(document.content[3].content?.[0].content?.[0].content?.[0]).toMatchObject({ text: "CAN_H", marks: [{ type: "bold" }] });
    expect(editorialRichTextToPlainText(document)).toEqual(["一、 引脚定义", "检查绝缘\n核对万用表档位\n确认型号", "信号定义", "CAN_H：总线高电平", "发送 0x1081407F 帧。"]);
  });

  it("keeps supported structure and removes unsafe nodes and links", () => {
    const document = sanitizeEditorialRichText({
      type: "doc",
      content: [
        { type: "heading", attrs: { level: 1 }, content: [{ type: "text", text: "标题" }] },
        { type: "paragraph", content: [{ type: "text", text: "危险", marks: [{ type: "link", attrs: { href: "javascript:alert(1)" } }] }, { type: "text", text: "安全", marks: [{ type: "link", attrs: { href: "https://ricewind.com" } }] }] },
        { type: "image", attrs: { src: "https://invalid.example/image.png" } },
      ],
    });
    expect(document?.content).toHaveLength(2);
    expect(document?.content[0]).toMatchObject({ type: "heading", attrs: { level: 2 } });
    expect(document?.content[1].content?.[0].marks).toBeUndefined();
    expect(document?.content[1].content?.[1].marks).toEqual([{ type: "link", attrs: { href: "https://ricewind.com" } }]);
  });
});
