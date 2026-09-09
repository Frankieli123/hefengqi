"use client";

import { useActionState, useState, useSyncExternalStore, type ChangeEvent } from "react";
import { LoaderCircleIcon } from "lucide-react";
import { saveCategory } from "@/app/admin/category-actions";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldGroup, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { CategoryInput } from "@/lib/category-tree";
import { locales } from "@/types/domain";

const languageNames = { zh: "中文", en: "English（英文）", ru: "Русский（俄文）" };
const subscribeToHydration = () => () => {};

export function CategoryForm({ category, parents, defaultParentId = "none" }: {
  category?: CategoryInput;
  parents: Array<{ value: string; label: string }>;
  defaultParentId?: string;
}) {
  const [state, action, pending] = useActionState(saveCategory, {});
  const hydrated = useSyncExternalStore(subscribeToHydration, () => true, () => false);
  const [values, setValues] = useState<Record<string, string>>({});
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

  return <form action={action} className="flex max-w-5xl flex-col gap-6" aria-busy={!hydrated || pending}>
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
      <CardHeader><CardTitle>多语言内容</CardTitle><CardDescription>分类发布后会同步到首页、产品中心目录和分类页面。</CardDescription></CardHeader>
      <CardContent><FieldGroup>{locales.map((locale) => {
        const translation = category?.translations.find((item) => item.locale === locale);
        return <FieldSet key={locale}><FieldLegend>{languageNames[locale]}</FieldLegend><FieldGroup>
          <FieldGroup className="sm:grid sm:grid-cols-2">
            <Field><FieldLabel htmlFor={`${locale}Name`}>分类名称（{locale}）</FieldLabel><Input id={`${locale}Name`} name={`${locale}Name`} {...field(`${locale}Name`, translation?.name)} maxLength={120} required /></Field>
            <Field><FieldLabel htmlFor={`${locale}Slug`}>网址名称（{locale}）</FieldLabel><Input id={`${locale}Slug`} name={`${locale}Slug`} {...field(`${locale}Slug`, translation?.slug)} pattern="[a-z0-9][a-z0-9-]*" maxLength={100} required placeholder="例如 power-systems" /><FieldDescription>用于网址，可使用小写字母、数字和连字符。</FieldDescription></Field>
          </FieldGroup>
          <Field><FieldLabel htmlFor={`${locale}Description`}>分类说明（{locale}）</FieldLabel><Textarea id={`${locale}Description`} name={`${locale}Description`} {...field(`${locale}Description`, translation?.description)} minLength={10} maxLength={2000} required /></Field>
          <FieldGroup className="sm:grid sm:grid-cols-2">
            <Field><FieldLabel htmlFor={`${locale}SeoTitle`}>搜索标题（{locale}，选填）</FieldLabel><Input id={`${locale}SeoTitle`} name={`${locale}SeoTitle`} {...field(`${locale}SeoTitle`, translation?.seoTitle)} maxLength={120} placeholder="留空使用分类名称" /></Field>
            <Field><FieldLabel htmlFor={`${locale}SeoDescription`}>搜索摘要（{locale}，选填）</FieldLabel><Textarea id={`${locale}SeoDescription`} name={`${locale}SeoDescription`} {...field(`${locale}SeoDescription`, translation?.seoDescription)} minLength={10} maxLength={180} placeholder="留空使用分类说明前 180 个字符" /></Field>
          </FieldGroup>
        </FieldGroup></FieldSet>;
      })}</FieldGroup></CardContent>
    </Card>
    {state.error ? <Alert variant="destructive"><AlertTitle>无法保存</AlertTitle><AlertDescription>{state.error}</AlertDescription></Alert> : null}
    <div className="flex flex-wrap gap-3"><Button type="submit" disabled={!hydrated || pending}>{pending ? <LoaderCircleIcon data-icon="inline-start" className="animate-spin" /> : null}{!hydrated ? "正在载入" : pending ? "正在保存" : category ? "保存分类" : "创建分类草稿"}</Button><Button variant="outline" nativeButton={false} render={<a href="/admin/categories" />}>返回分类列表</Button></div>
  </form>;
}
