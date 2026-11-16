import { saveProductFeaturedAttributes } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import type { Locale } from "@/types/domain";

type FeaturedAttribute = {
  id: string;
  key: string;
  label: string;
  displayLabel?: string;
  value: string;
  unit?: string;
  featured: boolean | null;
};

export function ProductFeaturedAttributesForm({ productId, locale, attributes }: { productId: string; locale: Locale; attributes: FeaturedAttribute[] }) {
  const hasConfiguration = attributes.some((attribute) => attribute.featured !== null);
  return (
    <Card className="max-w-5xl">
      <CardHeader>
        <CardTitle>关键参数展示</CardTitle>
        <CardDescription>最多选择 6 项显示在产品详情页黑色参数区；展示标题可按当前语言单独修改。</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={saveProductFeaturedAttributes}>
          <input type="hidden" name="productId" value={productId} />
          <input type="hidden" name="locale" value={locale} />
          <FieldGroup>
            <div className="flex flex-col divide-y">
              {attributes.map((attribute, index) => {
                const checked = hasConfiguration ? Boolean(attribute.featured) : index < 6;
                return (
                  <div className="grid gap-4 py-4 md:grid-cols-[auto_minmax(0,1fr)_minmax(0,1fr)] md:items-end" key={attribute.id}>
                    <Field orientation="horizontal" className="md:self-center">
                      <Checkbox id={`featured-${attribute.id}`} name="featuredAttributeId" value={attribute.id} defaultChecked={checked} />
                      <FieldLabel htmlFor={`featured-${attribute.id}`}>展示</FieldLabel>
                    </Field>
                    <Field>
                      <FieldLabel htmlFor={`display-label-${attribute.id}`}>展示标题（{locale.toUpperCase()}）</FieldLabel>
                      <Input id={`display-label-${attribute.id}`} name={`displayLabel-${attribute.id}`} defaultValue={attribute.displayLabel ?? attribute.label} maxLength={80} />
                      <FieldDescription>{attribute.key}</FieldDescription>
                    </Field>
                    <div className="pb-2 text-sm"><span className="text-muted-foreground">当前值：</span>{attribute.value}{attribute.unit ? ` ${attribute.unit}` : ""}</div>
                  </div>
                );
              })}
            </div>
            <Button type="submit" className="self-start">保存关键参数</Button>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}
