import { createEditorialContent } from "@/app/admin/actions";
import { LocaleSection } from "@/components/admin/locale-section";
import { RichTextEditor } from "@/components/admin/rich-text-editor";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { managedLocales } from "@/lib/admin-locales";

export const metadata = { title: "新建内容", robots: { index: false, follow: false } };

export default async function Page({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const query = await searchParams;
  return (
    <main className="flex flex-col gap-6 p-5 md:p-8">
      <div>
        <h1 className="text-2xl font-semibold">新建方案或文章</h1>
        <p className="mt-2 text-sm text-muted-foreground">七语内容必须基于同一组已核验事实。中文默认展开，其余语言折叠，品牌、型号、数字和单位不自动改写。</p>
      </div>
      {query.error === "empty-body" ? <Alert variant="destructive"><AlertTitle>无法保存草稿</AlertTitle><AlertDescription>七种语言正文都必须包含文字内容。</AlertDescription></Alert> : null}
      <form action={createEditorialContent} className="max-w-5xl rounded-lg border bg-card p-5 md:p-6">
        <FieldGroup>
          <div className="grid gap-5 md:grid-cols-3">
            <Field><FieldLabel htmlFor="type">内容类型</FieldLabel><Select name="type" defaultValue="solutions" required><SelectTrigger id="type" className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectGroup><SelectItem value="solutions">解决方案</SelectItem><SelectItem value="industries">行业</SelectItem><SelectItem value="cases">案例</SelectItem><SelectItem value="news">新闻</SelectItem></SelectGroup></SelectContent></Select></Field>
            <Field><FieldLabel htmlFor="authorName">新闻作者</FieldLabel><Input id="authorName" name="authorName" defaultValue="HEFENGQI Editorial Team" /><FieldDescription>仅新闻使用。</FieldDescription></Field>
            <Field><FieldLabel htmlFor="newsCategory">新闻分类</FieldLabel><Select name="newsCategory" defaultValue="INDUSTRY_INSIGHTS"><SelectTrigger id="newsCategory" className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectGroup><SelectItem value="INDUSTRY_INSIGHTS">行业洞察</SelectItem><SelectItem value="BUYING_GUIDE">选购指南</SelectItem><SelectItem value="TUTORIAL_GUIDE">教程指南</SelectItem></SelectGroup></SelectContent></Select><FieldDescription>仅新闻使用。</FieldDescription></Field>
          </div>
          <div className="grid gap-3">
            {managedLocales.map((locale) => <LocaleSection key={locale} locale={locale} complete={false}>
              <div className="grid gap-5">
                <div className="grid gap-5 sm:grid-cols-2"><Field><FieldLabel htmlFor={`${locale}Title`}>标题</FieldLabel><Input id={`${locale}Title`} name={`${locale}Title`} required /></Field><Field><FieldLabel htmlFor={`${locale}Slug`}>Slug</FieldLabel><Input id={`${locale}Slug`} name={`${locale}Slug`} pattern="[a-z0-9][a-z0-9-]*" required /></Field></div>
                <Field><FieldLabel htmlFor={`${locale}Summary`}>摘要</FieldLabel><Textarea id={`${locale}Summary`} name={`${locale}Summary`} required minLength={20} /></Field>
                <div className="grid gap-5 sm:grid-cols-2"><Field><FieldLabel htmlFor={`${locale}SeoTitle`}>SEO 标题（选填）</FieldLabel><Input id={`${locale}SeoTitle`} name={`${locale}SeoTitle`} maxLength={120} /></Field><Field><FieldLabel htmlFor={`${locale}SeoDescription`}>Meta Description（选填）</FieldLabel><Textarea id={`${locale}SeoDescription`} name={`${locale}SeoDescription`} maxLength={180} /></Field></div>
                <RichTextEditor name={`${locale}Body`} label="正文" />
              </div>
            </LocaleSection>)}
          </div>
          <Button type="submit" className="self-start">保存七语草稿</Button>
        </FieldGroup>
      </form>
    </main>
  );
}
