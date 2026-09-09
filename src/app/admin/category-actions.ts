"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSecureAdmin } from "@/lib/admin-session";
import { categoryErrorMessage, saveManagedCategory } from "@/lib/category-management";
import { parseCategoryForm, type CategoryFormState } from "@/lib/category-tree";

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
