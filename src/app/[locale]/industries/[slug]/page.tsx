import { redirect } from "next/navigation";
import { assertLocale } from "@/lib/locale";

type Props = { params: Promise<{ locale: string; slug: string }> };

export default async function Page({ params }: Props) {
  const { locale, slug } = await params;
  assertLocale(locale);
  redirect(`/${locale}/solutions/${slug}`);
}
