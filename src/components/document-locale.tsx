"use client";

import { useLayoutEffect } from "react";
import type { Locale } from "@/types/domain";

export function DocumentLocale({ locale }: { locale: Locale }) {
  useLayoutEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = locale === "ar" ? "rtl" : "ltr";
  }, [locale]);

  return null;
}
