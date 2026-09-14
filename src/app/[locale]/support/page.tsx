import { redirect } from "next/navigation";
import { assertLocale } from "@/lib/locale";
import { SUPPORT_PATH } from "@/lib/support";

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  assertLocale(locale);
  redirect(`/${locale}${SUPPORT_PATH}`);
}
