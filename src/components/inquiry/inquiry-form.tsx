"use client";

import { useCallback, useState } from "react";
import { CheckCircle2Icon, LoaderCircleIcon } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Turnstile } from "@/components/inquiry/turnstile";
import type { Locale } from "@/types/domain";

type Labels = { name: string; company: string; email: string; phone: string; country: string; quantity: string; requirements: string; privacy: string; submit: string; sending: string; success: string; reference: string; error: string };

export function InquiryForm({ locale, productId, labels, turnstileSiteKey }: { locale: Locale; productId?: string; labels: Labels; turnstileSiteKey?: string }) {
  const [token, setToken] = useState(""); const [pending, setPending] = useState(false); const [reference, setReference] = useState(""); const [error, setError] = useState(""); const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const onToken = useCallback((value: string) => setToken(value), []);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setPending(true); setError(""); setFieldErrors({});
    const form = new FormData(event.currentTarget);
    const payload = { locale, productId: productId || undefined, name: form.get("name"), company: form.get("company"), email: form.get("email"), phoneOrWhatsapp: form.get("phoneOrWhatsapp"), country: form.get("country"), quantity: form.get("quantity"), requirements: form.get("requirements"), privacyConsent: form.get("privacyConsent") === "true", turnstileToken: token, idempotencyKey: crypto.randomUUID() };
    try {
      const response = await fetch("/api/inquiries", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const result = await response.json() as { referenceId?: string; fieldErrors?: Record<string, string[]> };
      if (!response.ok || !result.referenceId) { setFieldErrors(result.fieldErrors ?? {}); throw new Error("submit_failed"); }
      setReference(result.referenceId); event.currentTarget.reset(); (window as unknown as { umami?: { track: (name: string) => void } }).umami?.track("inquiry-success");
    } catch { setError(labels.error); } finally { setPending(false); }
  }
  if (reference) return <Alert><CheckCircle2Icon /><AlertTitle>{labels.success}</AlertTitle><AlertDescription>{labels.reference}: <strong>{reference}</strong></AlertDescription></Alert>;
  return <form onSubmit={submit} noValidate className="rounded-lg border bg-card p-6 md:p-8"><FieldGroup className="grid gap-5 sm:grid-cols-2"><Field data-invalid={Boolean(fieldErrors.name)}><FieldLabel htmlFor="name">{labels.name}</FieldLabel><Input id="name" name="name" autoComplete="name" required minLength={2} aria-invalid={Boolean(fieldErrors.name)} /><FieldError>{fieldErrors.name?.[0]}</FieldError></Field><Field data-invalid={Boolean(fieldErrors.company)}><FieldLabel htmlFor="company">{labels.company}</FieldLabel><Input id="company" name="company" autoComplete="organization" required minLength={2} aria-invalid={Boolean(fieldErrors.company)} /><FieldError>{fieldErrors.company?.[0]}</FieldError></Field><Field data-invalid={Boolean(fieldErrors.email)}><FieldLabel htmlFor="email">{labels.email}</FieldLabel><Input id="email" name="email" type="email" autoComplete="email" required aria-invalid={Boolean(fieldErrors.email)} /><FieldError>{fieldErrors.email?.[0]}</FieldError></Field><Field><FieldLabel htmlFor="phone">{labels.phone}</FieldLabel><Input id="phone" name="phoneOrWhatsapp" type="tel" autoComplete="tel" /></Field><Field><FieldLabel htmlFor="country">{labels.country}</FieldLabel><Input id="country" name="country" autoComplete="country-name" required /></Field><Field><FieldLabel htmlFor="quantity">{labels.quantity}</FieldLabel><Input id="quantity" name="quantity" inputMode="numeric" /></Field><Field className="sm:col-span-2" data-invalid={Boolean(fieldErrors.requirements)}><FieldLabel htmlFor="requirements">{labels.requirements}</FieldLabel><Textarea id="requirements" name="requirements" required minLength={10} rows={6} aria-invalid={Boolean(fieldErrors.requirements)} /><FieldDescription>10–5000 characters</FieldDescription><FieldError>{fieldErrors.requirements?.[0]}</FieldError></Field><Field orientation="horizontal" className="sm:col-span-2"><Checkbox id="privacy" name="privacyConsent" value="true" required /><FieldLabel htmlFor="privacy" className="font-normal leading-6">{labels.privacy}</FieldLabel></Field><Field className="sm:col-span-2"><Turnstile siteKey={turnstileSiteKey} onToken={onToken} />{error ? <FieldError>{error}</FieldError> : null}<Button type="submit" size="lg" disabled={pending || !token} className="self-start">{pending ? <LoaderCircleIcon data-icon="inline-start" className="animate-spin" /> : null}{pending ? labels.sending : labels.submit}</Button></Field></FieldGroup></form>;
}
