import type { Metadata, Viewport } from "next";
import { env } from "@/lib/env";
import { headers } from "next/headers";
import "@fontsource-variable/noto-sans/wght.css";
import "@fontsource-variable/manrope/wght.css";
import { NotoSansScStyles } from "@/components/noto-sans-sc-styles";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(env.SITE_URL),
  title: { default: "RICEWIND", template: "%s" },
  description: "Reliable communications and critical power infrastructure solutions.",
  verification: {
    google: "lJYwSwpsY07Qgye908y8-WCh-H1Z1nmycmn38UzPqy4",
    yandex: "1b76c4c0c4702a86",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  interactiveWidget: "resizes-content",
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const locale = (await headers()).get("x-hfq-locale") ?? "en";
  return (
    <html lang={locale} dir={locale === "ar" ? "rtl" : "ltr"} data-scroll-behavior="smooth" suppressHydrationWarning>
      <body><NotoSansScStyles weights={[400]} />{children}</body>
    </html>
  );
}
