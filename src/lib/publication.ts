import "server-only";
import type { Prisma } from "@prisma/client";
import { locales } from "@/types/domain";
import { db } from "@/lib/db";

type PublicationDatabase = Pick<Prisma.TransactionClient, "product">;

export async function validateProductForPublication(productId: string, database: PublicationDatabase = db) {
  const product = await database.product.findUnique({ where: { id: productId }, include: { brand: true, translations: true, attributes: { where: { definition: { archivedAt: null } }, include: { definition: true } }, media: { include: { asset: true } }, category: { include: { attributes: { where: { archivedAt: null } } } } } });
  if (!product) return ["产品不存在"];
  const errors: string[] = [];
  if (product.brand.archivedAt) errors.push("品牌已归档");
  if (!product.brand.rightsConfirmed) errors.push("品牌展示或经销权尚未确认");
  if (product.category.status !== "PUBLISHED") errors.push("产品分类尚未发布");
  for (const locale of locales) {
    const translation = product.translations.find((item) => item.locale === locale);
    if (!translation) { errors.push(`缺少 ${locale} 翻译`); continue; }
    const fields = [translation.slug, translation.name, translation.directDefinition, translation.shortDescription, translation.whatItIs, translation.problemSolved, translation.suitableFor, translation.seoTitle, translation.seoDescription];
    if (fields.some((field) => !field.trim())) errors.push(`${locale} 必填内容不完整`);
    if (translation.directDefinition.trim().length < 40) errors.push(`${locale} 直接定义少于 40 个字符`);
  }
  const values = new Set(product.attributes.map((item) => item.definitionId));
  product.category.attributes.filter((item) => item.required).forEach((definition) => { if (!values.has(definition.id)) errors.push(`缺少必填参数 ${definition.key}`); });
  const hasMainImage = product.media.some((link) => link.assetId === product.primaryImageId && link.asset.kind === "IMAGE");
  if (!hasMainImage) errors.push("请先选择一张产品主图");
  return errors;
}
