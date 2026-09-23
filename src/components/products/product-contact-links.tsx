"use client";

import { MailIcon, PhoneIcon } from "lucide-react";
import { CopyEmailButton } from "@/components/copy-email-button";
import type { Locale } from "@/types/domain";

export function ProductContactLinks({
  locale,
  emailLabel,
  phoneLabel
}: {
  locale: Locale;
  emailLabel: string;
  phoneLabel: string;
}) {
  const email = "lee@ricewind.com";

  return (
    <div className="product-detail-contact-links" aria-label={`${emailLabel} / ${phoneLabel}`}>
      <CopyEmailButton locale={locale} email={email} className="product-detail-contact-link product-detail-contact-copy" ariaLabel={`${emailLabel}: ${email}`}>
        <MailIcon aria-hidden />
        <span><small>{emailLabel}</small><bdi>{email}</bdi></span>
      </CopyEmailButton>
      <a className="product-detail-contact-link" href="tel:+8617621197907" dir="ltr">
        <PhoneIcon aria-hidden /><span><small>{phoneLabel}</small><bdi>+86 17621197907</bdi></span>
      </a>
    </div>
  );
}
