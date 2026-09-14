import { BotIcon, CodeIcon } from "lucide-react";
import { createManualProduct } from "@/app/admin/actions";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { db } from "@/lib/db";
import { managedLocales } from "@/lib/admin-locales";
import { LocaleSection } from "@/components/admin/locale-section";

export const metadata = { title: "新建产品", robots: { index: false, follow: false } };

export default async function Page({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const [query, brands, categories] = await Promise.all([
    searchParams,
    db.brand.findMany({ where: { archivedAt: null }, orderBy: { name: "asc" } }),
    db.category.findMany({
      where: { status: { not: "ARCHIVED" } },
      include: { translations: { where: { locale: "zh" } } },
      orderBy: { sortOrder: "asc" },
    }),
  ]);

  return (
    <main className="flex flex-col gap-6 p-5 md:p-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">新建产品</h1>
          <p className="mt-2 text-sm text-muted-foreground">人工录入七语基础资料，或通过 AI / API 批量自动上传。</p>
        </div>
        <Button variant="outline" render={<a href="/api/admin/products/schema" target="_blank" />}>
          <CodeIcon data-icon="inline-start" />查看 AI 上传接口结构
        </Button>
      </div>

      <Card className="max-w-4xl border-primary/20 bg-primary/5">
        <CardContent className="flex flex-wrap items-center justify-between gap-4 p-4 text-sm">
          <div className="flex items-center gap-3">
            <BotIcon className="size-5 shrink-0 text-primary" />
            <div>
              <strong className="block text-foreground">支持 AI / API 自动化上传产品与七语说明</strong>
              <span className="text-xs text-muted-foreground">
                外部 AI 或脚本可调用 <code>POST /api/admin/products</code> 批量提交产品型号、说明（是什么/解决问题/核心优势/FAQ）与规格参数。
              </span>
            </div>
          </div>
          <Button size="sm" variant="outline" render={<a href="/api/admin/products/schema" target="_blank" />}>
            查看接口说明
          </Button>
        </CardContent>
      </Card>

      {query.error === "inactive-taxonomy" ? (
        <Alert variant="destructive">
          <AlertTitle>无法创建产品</AlertTitle>
          <AlertDescription>所选品牌或分类已停用，请刷新页面后重新选择。</AlertDescription>
        </Alert>
      ) : null}

      <form action={createManualProduct} className="max-w-4xl rounded-lg border bg-card p-6">
        <FieldGroup>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="model">型号</FieldLabel>
              <Input id="model" name="model" required />
            </Field>
            <Field>
              <FieldLabel htmlFor="sku">SKU（选填）</FieldLabel>
              <Input id="sku" name="sku" />
            </Field>
            <Field>
              <FieldLabel htmlFor="brandId">品牌</FieldLabel>
              <Select name="brandId" defaultValue={brands[0]?.id} required>
                <SelectTrigger id="brandId" className="w-full">
                  <SelectValue placeholder="选择品牌" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {brands.map((brand) => (
                      <SelectItem key={brand.id} value={brand.id}>
                        {brand.name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel htmlFor="categoryId">分类</FieldLabel>
              <Select name="categoryId" defaultValue={categories[0]?.id} required>
                <SelectTrigger id="categoryId" className="w-full">
                  <SelectValue placeholder="选择分类" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.translations[0]?.name ?? category.key}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
          </div>
          {managedLocales.map((locale) => (
            <LocaleSection locale={locale} key={locale} complete={false}>
              <div className="grid gap-4">
              <Field>
                <FieldLabel htmlFor={`${locale}Name`}>产品名称</FieldLabel>
                <Input id={`${locale}Name`} name={`${locale}Name`} required />
              </Field>
              <Field>
                <FieldLabel htmlFor={`${locale}Definition`}>40–60 字直接定义</FieldLabel>
                <Textarea id={`${locale}Definition`} name={`${locale}Definition`} required minLength={40} />
              </Field>
              </div>
            </LocaleSection>
          ))}
          <Button type="submit" className="self-start" disabled={!brands.length || !categories.length}>
            创建草稿
          </Button>
        </FieldGroup>
      </form>
    </main>
  );
}
