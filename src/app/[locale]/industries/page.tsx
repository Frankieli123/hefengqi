import { redirect } from "next/navigation";
import { assertLocale } from "@/lib/locale";

type Props = { params: Promise<{ locale: string }> };

export default async function Page({ params }: Props) {
  const { locale } = await params;
  assertLocale(locale);
  redirect(`/${locale}/solutions`);
}
