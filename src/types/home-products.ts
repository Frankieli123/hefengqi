import type { ProductListView } from "@/types/domain";

export type HomeProductCardView = Pick<ProductListView, "id" | "slug" | "name" | "model" | "brand" | "brandDisplayName" | "image">;

export interface HomeProductGroupView {
  key: string;
  name: string;
  href: string;
  products: HomeProductCardView[];
  hasMore: boolean;
}

/** The small response returned when a homepage shelf asks for another page. */
export interface HomeProductGroupPageView extends HomeProductGroupView {
  nextOffset: number | null;
}
