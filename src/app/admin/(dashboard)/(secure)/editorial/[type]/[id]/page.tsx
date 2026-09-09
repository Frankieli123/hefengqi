import type { JSONContent } from "@tiptap/react";
import { notFound } from "next/navigation";
import { changeEditorialStatus, updateEditorialContent } from "@/app/admin/actions";
import { RichTextEditor } from "@/components/admin/rich-text-editor";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { requireSecureAdmin } from "@/lib/admin-session";
import { db } from "@/lib/db";

export const metadata = { title: "编辑方案或文章", robots: { index: false, follow: false } };

type Props = {
  params: Promise<{ type: string; id: string }>;
  searchParams: Promise<{ saved?: string; error?: string }>;
};

type TranslationRecord = {
  locale: "zh" | "en" | "ru";
  slug: string;
  title: string;
  summary: string;
  body: unknown;
  seoTitle: string;
  seoDescription: string;
};

export default async function Page({ params, searchParams }: Props) {
  const [{ type, id }, query, session] = await Promise.all([params, searchParams, requireSecureAdmin()]);
  if (type !== "solutions" && type !== "industries" && type !== "cases" && type !== "news") notFound();
  let item: { id: string; status: string; authorName?: string; translations: TranslationRecord[] } | null;
  if (type === "solutions") item = await db.solution.findUnique({ where: { id }, include: { translations: true } });
  else if (type === "industries") item = await db.industry.findUnique({ where: { id }, include: { translations: true } });
  else if (type === "cases") item = await db.caseStudy.findUnique({ where: { id }, include: { translations: true } });
  else item = await db.newsArticle.findUnique({ where: { id }, include: { translations: true } });
  if (!item) notFound();

  return <main className="flex flex-col gap-6 p-5 md:p-8"><div className="flex flex-wrap items-start justify-between gap-4"><div><div className="flex items-center gap-3"><h1 className="text-2xl font-semibold">编辑方案或文章</h1><Badge variant="secondary">{item.status}</Badge></div><p className="mt-2 text-sm text-muted-foreground">保存修订后回到草稿；发布和归档仅限管理员。</p></div><Button variant="outline" render={<a href="/admin/editorial" />}>返回列表</Button></div>{query.saved ? <Alert><AlertTitle>修订已保存</AlertTitle><AlertDescription>三语内容已保存为草稿，并记录了上一版本快照。</AlertDescription></Alert> : null}{query.error ? <Alert variant="destructive"><AlertTitle>无法完成操作</AlertTitle><AlertDescription>{query.error === "empty-body" ? "中英俄三语正文都必须包含文字内容。" : query.error}</AlertDescription></Alert> : null}{session.user.role === "ADMIN" ? <div className="flex flex-wrap gap-3"><form action={changeEditorialStatus}><input type="hidden" name="type" value={type} /><input type="hidden" name="id" value={id} /><Button type="submit" name="status" value="PUBLISHED" disabled={item.status === "PUBLISHED"}>发布</Button></form><form action={changeEditorialStatus}><input type="hidden" name="type" value={type} /><input type="hidden" name="id" value={id} /><Button type="submit" name="status" value={item.status === "ARCHIVED" ? "DRAFT" : "ARCHIVED"} variant="outline">{item.status === "ARCHIVED" ? "恢复为草稿" : "归档"}</Button></form></div> : null}<Card className="max-w-5xl"><CardHeader><CardTitle>三语内容</CardTitle><CardDescription>标题、摘要、正文及 SEO 字段都必须来自可核验资料。</CardDescription></CardHeader><CardContent><form action={updateEditorialContent}><input type="hidden" name="type" value={type} /><input type="hidden" name="id" value={id} /><FieldGroup>{type === "news" ? <Field><FieldLabel htmlFor="authorName">新闻作者</FieldLabel><Input id="authorName" name="authorName" defaultValue={item.authorName} required /><FieldDescription>请使用可核验的作者或编辑团队名称。</FieldDescription></Field> : null}{(["zh", "en", "ru"] as const).map((locale) => { const translation = item.translations.find((entry) => entry.locale === locale); if (!translation) return <Alert variant="destructive" key={locale}><AlertTitle>缺少 {locale.toUpperCase()} 内容</AlertTitle><AlertDescription>该记录数据不完整，暂不能通过此页面修订。</AlertDescription></Alert>; return <section className="flex flex-col gap-5 border-t pt-6" key={locale}><h2 className="text-lg font-semibold">{locale.toUpperCase()}</h2><div className="grid gap-5 sm:grid-cols-2"><Field><FieldLabel htmlFor={`${locale}Title`}>标题</FieldLabel><Input id={`${locale}Title`} name={`${locale}Title`} defaultValue={translation.title} required /></Field><Field><FieldLabel htmlFor={`${locale}Slug`}>Slug</FieldLabel><Input id={`${locale}Slug`} name={`${locale}Slug`} defaultValue={translation.slug} pattern="[a-z0-9][a-z0-9-]*" required /></Field></div><Field><FieldLabel htmlFor={`${locale}Summary`}>摘要</FieldLabel><Textarea id={`${locale}Summary`} name={`${locale}Summary`} defaultValue={translation.summary} required minLength={20} /></Field><div className="grid gap-5 sm:grid-cols-2"><Field><FieldLabel htmlFor={`${locale}SeoTitle`}>SEO 标题</FieldLabel><Input id={`${locale}SeoTitle`} name={`${locale}SeoTitle`} defaultValue={translation.seoTitle} required maxLength={120} /></Field><Field><FieldLabel htmlFor={`${locale}SeoDescription`}>Meta Description</FieldLabel><Textarea id={`${locale}SeoDescription`} name={`${locale}SeoDescription`} defaultValue={translation.seoDescription} required maxLength={180} /></Field></div><RichTextEditor name={`${locale}Body`} label="正文" initialContent={translation.body as JSONContent} /></section>; })}<Button type="submit" className="self-start">保存三语修订</Button></FieldGroup></form></CardContent></Card></main>;
}
