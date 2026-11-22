import type { ProductView } from "@/types/domain";
/** Presentation uses only the current published record; no cross-record identity inference. */
export function refineBatch2Product(product: ProductView): ProductView {
  if (product.model === "10G-1310NM-1.4KM-SM-SFP+") {
    return { ...product, seoTitle: `${product.name} | ${product.brandDisplayName ?? product.brand}`, seoDescription: product.shortDescription || product.directDefinition };
  }
  if (product.model.toLowerCase().includes("flatpack2")) {
    return { ...product, seoTitle: `${product.name} | ${product.model}`, seoDescription: product.directDefinition };
  }
  return product;
}
