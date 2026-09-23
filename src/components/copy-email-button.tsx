"use client";

import { useState } from "react";
import type { Locale } from "@/types/domain";

const copiedLabels: Record<Locale, string> = {
  zh: "已复制",
  en: "Copied",
  ru: "Скопировано",
  fr: "Copié",
  de: "Kopiert",
  es: "Copiado",
  ar: "تم النسخ"
};

export function CopyEmailButton({
  locale,
  email,
  className,
  ariaLabel,
  children
}: {
  locale: Locale;
  email: string;
  className?: string;
  ariaLabel?: string;
  children: React.ReactNode;
}) {
  const [copied, setCopied] = useState(false);

  async function copyEmail() {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(email);
      } else {
        const helper = document.createElement("textarea");
        helper.value = email;
        helper.setAttribute("readonly", "true");
        helper.style.position = "fixed";
        helper.style.opacity = "0";
        document.body.appendChild(helper);
        helper.select();
        document.execCommand("copy");
        helper.remove();
      }
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button
      type="button"
      dir="ltr"
      className={className}
      onClick={copyEmail}
      aria-label={ariaLabel ?? email}
      title={copied ? copiedLabels[locale] : email}
    >
      {children}
      <span className="sr-only" aria-live="polite">{copied ? copiedLabels[locale] : ""}</span>
    </button>
  );
}
