import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { resolveLocale } from "@/lib/language-detection";

export default async function RootPage() {
  const [cookieStore, headerStore] = await Promise.all([cookies(), headers()]);
  redirect(`/${resolveLocale(cookieStore.get("HFQ_LOCALE")?.value, headerStore.get("accept-language"), headerStore.get("x-edgeone-country-code"))}`);
}
