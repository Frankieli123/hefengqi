"use client";

import Image from "next/image";
import { useActionState, useState } from "react";
import { LoaderCircleIcon } from "lucide-react";
import { saveCategoryFeaturedProduct } from "@/app/admin/category-actions";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export type HomeProductSeriesSetting = {
  categoryId: string;
  categoryKey: string;
  categoryName: string;
  selectedProductId: string | null;
  products: Array<{
    id: string;
    model: string;
    brand: string;
    name: string;
    image: { src: string; width: number; height: number };
  }>;
};

function SeriesSettingCard({ item }: { item: HomeProductSeriesSetting }) {
  const [state, action, pending] = useActionState(saveCategoryFeaturedProduct, {});
  const [productId, setProductId] = useState(item.selectedProductId ?? "none");
  const selected = productId === "none" ? item.products[0] : item.products.find((product) => product.id === productId);

  return <Card className="min-w-0 bg-background">
    <CardHeader>
      <CardTitle>{item.categoryName}</CardTitle>
      <CardDescription>首页产品系列 · {item.categoryKey}</CardDescription>
    </CardHeader>
    <CardContent>
      <form action={action} className="flex flex-col gap-4" aria-busy={pending}>
        <input type="hidden" name="categoryId" value={item.categoryId} />
        <Field>
          <FieldLabel htmlFor={`home-series-${item.categoryId}`}>首页代表产品</FieldLabel>
          <Select name="homeFeaturedProductId" disabled={pending} value={productId} onValueChange={(value) => setProductId(value ?? "none")}>
            <SelectTrigger id={`home-series-${item.categoryId}`} className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">自动选择该分类下的合规产品</SelectItem>
              {item.products.map((product) => <SelectItem key={product.id} value={product.id}>{product.brand} · {product.model} · {product.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <FieldDescription>图片直接使用所选产品的当前主图，产品主图更新后首页自动同步。</FieldDescription>
        </Field>
        {selected ? <div className="flex min-w-0 items-center gap-4 rounded-lg border bg-muted/20 p-3">
          <div className="relative size-24 shrink-0 overflow-hidden rounded-md bg-white"><Image src={selected.image.src} alt={selected.name} fill sizes="96px" className="object-contain" /></div>
          <div className="min-w-0"><p className="truncate text-sm font-medium">{selected.name}</p><p className="mt-1 truncate text-xs text-muted-foreground">{selected.brand} · {selected.model}</p><p className="mt-2 text-xs text-muted-foreground">{productId === "none" ? "当前自动展示" : "当前选定展示"}</p></div>
        </div> : <div className="grid aspect-[3/1] place-items-center rounded-lg bg-muted/40 text-sm text-muted-foreground">该分类暂无可公开展示主图的产品</div>}
        {state.error ? <Alert variant="destructive"><AlertTitle>保存失败</AlertTitle><AlertDescription>{state.error}</AlertDescription></Alert> : null}
        {state.success ? <Alert><AlertTitle>已保存</AlertTitle><AlertDescription>{state.success}</AlertDescription></Alert> : null}
        <Button type="submit" className="self-start" disabled={pending}>{pending ? <LoaderCircleIcon data-icon="inline-start" className="animate-spin" /> : null}{pending ? "正在保存" : "保存此卡片"}</Button>
      </form>
    </CardContent>
  </Card>;
}

export function HomeProductSeriesSettings({ items }: { items: HomeProductSeriesSetting[] }) {
  return <div className="grid gap-5 lg:grid-cols-2">{items.map((item) => <SeriesSettingCard key={item.categoryId} item={item} />)}</div>;
}
