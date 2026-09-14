export const locales = ["zh", "en", "ru"] as const;
export type Locale = (typeof locales)[number];
export type Role = "ADMIN" | "EDITOR";
export type PublishStatus = "DRAFT" | "NEEDS_REVIEW" | "READY" | "PUBLISHED" | "ARCHIVED";
export type ContentOrigin = "MANUAL" | "LOCAL_IMPORT" | "WEB_SOURCE" | "AI";
export type NewsCategory = "INDUSTRY_INSIGHTS" | "BUYING_GUIDE" | "TUTORIAL_GUIDE";

export interface LocalizedText {
  zh: string;
  en: string;
  ru: string;
}

export interface CategoryView {
  id: string;
  key: string;
  slug: string;
  path: string;
  name: string;
  description: string;
  seoTitle?: string;
  seoDescription?: string;
  parentKey?: string;
  level: number;
  count: number;
  updatedAt?: string;
}

export interface ProductAttributeView {
  key: string;
  label: string;
  value: string;
  unit?: string;
  comparable: boolean;
}

export interface ProductImageView {
  src: string;
  alt: string;
  width: number;
  height: number;
}

export interface ProductCategoryTrailItem {
  key: string;
  name: string;
  path: string;
}

export interface ProductView {
  id: string;
  slug: string;
  model: string;
  sku?: string;
  brand: string;
  brandId?: string;
  categoryKey: string;
  categoryName: string;
  categoryTrail?: ProductCategoryTrailItem[];
  name: string;
  directDefinition: string;
  shortDescription: string;
  whatItIs: string;
  problemSolved: string;
  suitableFor: string;
  advantages: string[];
  applications: string[];
  attributes: ProductAttributeView[];
  featuredAttributes?: ProductAttributeView[];
  faqs: Array<{ question: string; answer: string }>;
  image?: ProductImageView;
  images?: ProductImageView[];
  updatedAt: string;
  sourceNote?: string;
  seoTitle?: string;
  seoDescription?: string;
}

export interface EditorialItem {
  id: string;
  slug: string;
  title: string;
  summary: string;
  body: string[];
  updatedAt: string;
  publishedAt?: string;
  authorName?: string;
  seoTitle?: string;
  seoDescription?: string;
  coverImage?: ProductImageView;
  newsCategory?: NewsCategory;
  relatedProductSlots?: Array<{ productId: string; sortOrder: number }>;
}
