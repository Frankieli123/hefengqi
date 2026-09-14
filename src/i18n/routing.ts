import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["zh", "en", "ru", "fr", "de", "es", "ar"],
  defaultLocale: "en",
  localePrefix: "always",
});

export type AppLocale = (typeof routing.locales)[number];
