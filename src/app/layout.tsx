import type { Metadata } from "next";
import { env } from "@/lib/env";
import { headers } from "next/headers";
import "@fontsource-variable/noto-sans/wght.css";
import "@fontsource-variable/manrope/wght.css";
import "@fontsource/noto-sans-sc/400.css";
import "@fontsource/noto-sans-sc/500.css";
import "@fontsource/noto-sans-sc/600.css";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(env.SITE_URL),
  title: { default: "HEFENGQI", template: "%s | HEFENGQI" },
  description: "通信与能源设备集成服务。",
  verification: {
    google: "lJYwSwpsY07Qgye908y8-WCh-H1Z1nmycmn38UzPqy4",
    yandex: "1b76c4c0c4702a86",
  },
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const locale = (await headers()).get("x-hfq-locale") ?? "en";
  return (
    <html lang={locale} dir={locale === "ar" ? "rtl" : "ltr"} data-scroll-behavior="smooth" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
