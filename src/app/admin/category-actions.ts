"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSecureAdmin } from "@/lib/admin-session";
import { categoryErrorMessage, saveManagedCategory, setCategoryHomeFeaturedProduct } from "@/lib/category-management";
import { parseCategoryFeaturedProductForm, parseCategoryForm, type CategoryFormState } from "@/lib/category-tree";
import { locales } from "@/types/domain";

export async function saveCategory(_previous: CategoryFormState, formData: FormData): Promise<CategoryFormState> {
  const session = await requireSecureAdmin("ADMIN");
  let id: string;
  try {
    id = await saveManagedCategory(parseCategoryForm(formData), session.user.id);
  } catch (error) {
    return { error: categoryErrorMessage(error) };
  }
  revalidatePath("/", "layout");
  redirect(`/admin/categories/${id}?saved=1`);
}

export async function saveCategoryFeaturedProduct(_previous: CategoryFormState, formData: FormData): Promise<CategoryFormState> {
  const session = await requireSecureAdmin("ADMIN");
  let categoryId = "";
  try {
    const input = parseCategoryFeaturedProductForm(formData);
    categoryId = input.categoryId;
    await setCategoryHomeFeaturedProduct(input.categoryId, input.productId, session.user.id);
  } catch (error) {
    return { error: categoryErrorMessage(error) };
  }
  revalidatePath(`/admin/categories/${categoryId}`);
  revalidatePath("/admin/settings");
  for (const locale of locales) revalidatePath(`/${locale}`);
  return { success: "首页展示产品已更新；首页将使用该产品当前的主图。" };
}
