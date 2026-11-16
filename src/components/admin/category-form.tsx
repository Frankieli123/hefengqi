"use client";

import { useActionState, useState, useSyncExternalStore, type ChangeEvent } from "react";
import Image from "next/image";
import { LoaderCircleIcon } from "lucide-react";
import { saveCategory, saveCategoryFeaturedProduct } from "@/app/admin/category-actions";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { LocaleSection } from "@/components/admin/locale-section";
import type { CategoryInput } from "@/lib/category-tree";
import { locales } from "@/types/domain";
const subscribeToHydration = () => () => {};

type FeaturedProductOption = { id: string; model: string; brand: string; name: string; image?: { src: string; width: number; height: number } };

export function CategoryForm({ category, parents, defaultParentId = "none", featuredProducts = [], homeSeriesEnabled = false }: {
  category?: CategoryInput & { homeFeaturedProductId?: string | null };
  parents: Array<{ value: string; label: string }>;
  defaultParentId?: string;
  featuredProducts?: FeaturedProductOption[];
  homeSeriesEnabled?: boolean;
}) {
  const [state, action, pending] = useActionState(saveCategory, {});
  const [featuredState, featuredAction, featuredPending] = useActionState(saveCategoryFeaturedProduct, {});
  const hydrated = useSyncExternalStore(subscribeToHydration, () => true, () => false);
  const [values, setValues] = useState<Record<string, string>>({});
  const [featuredProductId, setFeaturedProductId] = useState(category?.homeFeaturedProductId ?? "none");
  // Controlled values survive React's automatic form reset after a rejected save.
  function field(name: string, fallback = "") {
    return {
      value: values[name] ?? fallback,
      disabled: !hydrated || pending,
      onChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const value = event.target.value;
        setValues((current) => ({ ...current, [name]: value }));
      },
    };
  }
  const items = [{ value: "none", label: "无上级（一级分类）" }, ...parents];

  const selectedFeaturedProduct = featuredProductId === "none" ? featuredProducts[0] : featuredProducts.find((product) => product.id === featuredProductId);

  return <div className="flex max-w-5xl flex-col gap-6">
  <form action={action} className="flex flex-col gap-6" aria-busy={!hydrated || pending}>
    {category?.id ? <input type="hidden" name="categoryId" value={category.id} /> : null}
    <Card>
      <CardHeader><CardTitle>分类设置</CardTitle><CardDescription>设置目录层级和展示顺序。数值越小，在同级分类中越靠前。</CardDescription></CardHeader>
      <CardContent><FieldGroup>
        <FieldGroup className="sm:grid sm:grid-cols-2">
          <Field><FieldLabel htmlFor="category-key">内部标识</FieldLabel><Input id="category-key" name="key" {...field("key", category?.key)} readOnly={Boolean(category)} pattern="[a-z0-9][a-z0-9-]*" maxLength={100} required placeholder="例如 communication-power" /><FieldDescription>小写字母、数字和连字符，创建后固定；前台显示下方填写的名称。</FieldDescription></Field>
          <Field><FieldLabel htmlFor="category-order">排序</FieldLabel><Input id="category-order" name="sortOrder" type="number" min={0} max={10000} step={1} {...field("sortOrder", String(category?.sortOrder ?? 0))} required /></Field>
        </FieldGroup>
        <Field><FieldLabel htmlFor="category-parent">上级分类</FieldLabel><Select name="parentId" items={items} disabled={!hydrated || pending} value={values.parentId ?? (category ? category.parentId ?? "none" : defaultParentId)} onValueChange={(parentId) => setValues((current) => ({ ...current, parentId: parentId ?? "none" }))}><SelectTrigger id="category-parent" className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectGroup>{items.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectGroup></SelectContent></Select><FieldDescription>最多支持三级。调整上级时，会同时更新子分类层级与旧网址跳转。</FieldDescription></Field>
      </FieldGroup></CardContent>
    </Card>
    <Card>
      <CardHeader><CardTitle>七语内容</CardTitle><CardDescription>中文默认展开，其余语言折叠；发布前需要完成全部语言字段。</CardDescription></CardHeader>
      <CardContent><FieldGroup>{locales.map((locale) => {
        const translation = category?.translations.find((item) => item.locale === locale);
        const complete = Boolean(translation?.name && translation.slug && translation.description && translation.seoTitle && translation.seoDescription);
        return <LocaleSection key={locale} locale={locale} complete={complete}><FieldGroup>
          <FieldGroup className="sm:grid sm:grid-cols-2">
            <Field><FieldLabel htmlFor={`${locale}Name`}>分类名称（{locale}）</FieldLabel><Input id={`${locale}Name`} name={`${locale}Name`} {...field(`${locale}Name`, translation?.name)} maxLength={120} required /></Field>
            <Field><FieldLabel htmlFor={`${locale}Slug`}>网址名称（{locale}）</FieldLabel><Input id={`${locale}Slug`} name={`${locale}Slug`} {...field(`${locale}Slug`, translation?.slug)} pattern="[a-z0-9][a-z0-9-]*" maxLength={100} required placeholder="例如 power-systems" /><FieldDescription>用于网址，可使用小写字母、数字和连字符。</FieldDescription></Field>
          </FieldGroup>
          <Field><FieldLabel htmlFor={`${locale}Description`}>分类说明（{locale}）</FieldLabel><Textarea id={`${locale}Description`} name={`${locale}Description`} {...field(`${locale}Description`, translation?.description)} minLength={10} maxLength={2000} required /></Field>
          <FieldGroup className="sm:grid sm:grid-cols-2">
            <Field><FieldLabel htmlFor={`${locale}SeoTitle`}>搜索标题（{locale}，选填）</FieldLabel><Input id={`${locale}SeoTitle`} name={`${locale}SeoTitle`} {...field(`${locale}SeoTitle`, translation?.seoTitle)} maxLength={120} placeholder="留空使用分类名称" /></Field>
            <Field><FieldLabel htmlFor={`${locale}SeoDescription`}>搜索摘要（{locale}，选填）</FieldLabel><Textarea id={`${locale}SeoDescription`} name={`${locale}SeoDescription`} {...field(`${locale}SeoDescription`, translation?.seoDescription)} minLength={10} maxLength={180} placeholder="留空使用分类说明前 180 个字符" /></Field>
          </FieldGroup>
        </FieldGroup></LocaleSection>;
      })}</FieldGroup></CardContent>
    </Card>
    {state.error ? <Alert variant="destructive"><AlertTitle>无法保存</AlertTitle><AlertDescription>{state.error}</AlertDescription></Alert> : null}
    <div className="flex flex-wrap gap-3"><Button type="submit" disabled={!hydrated || pending}>{pending ? <LoaderCircleIcon data-icon="inline-start" className="animate-spin" /> : null}{!hydrated ? "正在载入" : pending ? "正在保存" : category ? "保存分类" : "创建分类草稿"}</Button><Button variant="outline" nativeButton={false} render={<a href="/admin/categories" />}>返回分类列表</Button></div>
  </form>
  {category?.id && homeSeriesEnabled ? <form action={featuredAction} className="flex flex-col gap-4" aria-busy={featuredPending}>
    <input type="hidden" name="categoryId" value={category.id} />
    <Card>
      <CardHeader><CardTitle>首页产品系列展示</CardTitle><CardDescription>选择一个已发布产品作为本分类在首页“产品系列”的代表。首页会实时读取该产品当前主图，修改产品主图后无需重复设置。</CardDescription></CardHeader>
      <CardContent className="flex flex-col gap-4">
        <Field><FieldLabel htmlFor="home-featured-product">代表产品</FieldLabel><Select name="homeFeaturedProductId" disabled={!hydrated || featuredPending} value={featuredProductId} onValueChange={(value) => setFeaturedProductId(value ?? "none")}><SelectTrigger id="home-featured-product" className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">暂不设置（首页使用该分类下的第一个合规产品）</SelectItem>{featuredProducts.map((product) => <SelectItem key={product.id} value={product.id}>{product.brand} · {product.model} · {product.name}</SelectItem>)}</SelectContent></Select><FieldDescription>候选仅包含当前分类及子分类中，已发布且图片通过公开展示检查的产品。</FieldDescription></Field>
        {selectedFeaturedProduct?.image ? <div className="flex items-center gap-4 rounded-lg border bg-muted/20 p-3"><div className="relative size-20 shrink-0 overflow-hidden rounded-md bg-white"><Image src={selectedFeaturedProduct.image.src} alt={selectedFeaturedProduct.name} fill sizes="80px" className="object-contain" /></div><div><p className="text-sm font-medium">{selectedFeaturedProduct.name}</p><p className="mt-1 text-xs text-muted-foreground">{selectedFeaturedProduct.brand} · {selectedFeaturedProduct.model}</p><p className="mt-1 text-xs text-muted-foreground">{featuredProductId === "none" ? "当前自动展示的产品主图" : "当前选定产品的主图预览"}</p></div></div> : null}
        {featuredState.error ? <Alert variant="destructive"><AlertTitle>无法更新首页展示产品</AlertTitle><AlertDescription>{featuredState.error}</AlertDescription></Alert> : null}
        {featuredState.success ? <Alert><AlertTitle>已更新</AlertTitle><AlertDescription>{featuredState.success}</AlertDescription></Alert> : null}
        <div><Button type="submit" disabled={!hydrated || featuredPending}>{featuredPending ? <LoaderCircleIcon data-icon="inline-start" className="animate-spin" /> : null}{featuredPending ? "正在保存" : "保存首页展示产品"}</Button></div>
      </CardContent>
    </Card>
  </form> : null}
  </div>;
}
