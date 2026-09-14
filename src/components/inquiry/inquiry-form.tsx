"use client";

import { useCallback, useRef, useState } from "react";
import { CheckCircle2Icon, LoaderCircleIcon } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Turnstile } from "@/components/inquiry/turnstile";
import type { Locale } from "@/types/domain";

type CategoryOption = { id: string; name: string };
type ValidationField = "name" | "email" | "country" | "interestedCategoryId" | "requirements" | "privacyConsent";
type Labels = {
  name: string;
  email: string;
  phone: string;
  country: string;
  interestedProduct: string;
  selectProduct: string;
  requirements: string;
  requirementsHint: string;
  privacy: string;
  submit: string;
  sending: string;
  success: string;
  reference: string;
  error: string;
  validation: Record<ValidationField, string>;
};

function RequiredMark() {
  return <span className="text-destructive" aria-hidden="true">*</span>;
}

export function InquiryForm({ locale, productId, initialRequirements, initialInterestedCategoryId, categories, labels, turnstileSiteKey }: {
  locale: Locale;
  productId?: string;
  initialRequirements?: string;
  initialInterestedCategoryId?: string;
  categories: CategoryOption[];
  labels: Labels;
  turnstileSiteKey?: string;
}) {
  const [token, setToken] = useState("");
  const [pending, setPending] = useState(false);
  const [reference, setReference] = useState("");
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const idempotencyKey = useRef<string | undefined>(undefined);
  const onToken = useCallback((value: string) => setToken(value), []);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    setFieldErrors({});
    const form = new FormData(event.currentTarget);
    idempotencyKey.current ??= crypto.randomUUID();
    const payload = {
      locale,
      productId: productId || undefined,
      interestedCategoryId: form.get("interestedCategoryId"),
      name: form.get("name"),
      email: form.get("email"),
      phoneOrWhatsapp: form.get("phoneOrWhatsapp"),
      country: form.get("country"),
      requirements: form.get("requirements"),
      privacyConsent: form.get("privacyConsent") === "true",
      turnstileToken: token,
      idempotencyKey: idempotencyKey.current,
    };

    try {
      let response: Response | undefined;
      for (let attempt = 0; attempt < 2; attempt += 1) {
        const controller = new AbortController();
        const timeout = window.setTimeout(() => controller.abort(), 12_000);
        try {
          response = await fetch("/api/inquiries", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload), signal: controller.signal });
          if (response.ok || response.status < 500 || attempt === 1) break;
        } catch (requestError) {
          if (attempt === 1) throw requestError;
        } finally {
          window.clearTimeout(timeout);
        }
      }
      if (!response) throw new Error("submit_failed");
      const result = await response.json() as { referenceId?: string; fieldErrors?: Record<string, string[]> };
      if (!response.ok || !result.referenceId) {
        const localizedErrors = Object.fromEntries(Object.keys(result.fieldErrors ?? {}).flatMap((field) => {
          const message = labels.validation[field as ValidationField];
          return message ? [[field, [message]]] : [];
        }));
        setFieldErrors(localizedErrors);
        throw new Error("submit_failed");
      }
      setReference(result.referenceId);
      event.currentTarget.reset();
      idempotencyKey.current = undefined;
      setToken("");
      (window as unknown as { umami?: { track: (name: string) => void } }).umami?.track("inquiry-success");
    } catch {
      setError(labels.error);
    } finally {
      setPending(false);
    }
  }

  if (reference) return <Alert><CheckCircle2Icon /><AlertTitle>{labels.success}</AlertTitle><AlertDescription>{labels.reference}: <strong>{reference}</strong></AlertDescription></Alert>;

  return (
    <form onSubmit={submit} noValidate className="rounded-lg border bg-card p-6 md:p-8">
      <FieldGroup className="grid gap-5 sm:grid-cols-2">
        <Field data-invalid={Boolean(fieldErrors.name)}>
          <FieldLabel htmlFor="name">{labels.name}<RequiredMark /></FieldLabel>
          <Input id="name" name="name" autoComplete="name" required minLength={2} aria-invalid={Boolean(fieldErrors.name)} />
          <FieldError>{fieldErrors.name?.[0]}</FieldError>
        </Field>
        <Field data-invalid={Boolean(fieldErrors.email)}>
          <FieldLabel htmlFor="email">{labels.email}<RequiredMark /></FieldLabel>
          <Input id="email" name="email" type="email" autoComplete="email" required aria-invalid={Boolean(fieldErrors.email)} />
          <FieldError>{fieldErrors.email?.[0]}</FieldError>
        </Field>
        <Field>
          <FieldLabel htmlFor="phone">{labels.phone}</FieldLabel>
          <Input id="phone" name="phoneOrWhatsapp" type="tel" autoComplete="tel" />
        </Field>
        <Field data-invalid={Boolean(fieldErrors.country)}>
          <FieldLabel htmlFor="country">{labels.country}<RequiredMark /></FieldLabel>
          <Input id="country" name="country" autoComplete="country-name" required aria-invalid={Boolean(fieldErrors.country)} />
          <FieldError>{fieldErrors.country?.[0]}</FieldError>
        </Field>
        <Field className="sm:col-span-2" data-invalid={Boolean(fieldErrors.interestedCategoryId)}>
          <FieldLabel htmlFor="interestedCategoryId">{labels.interestedProduct}<RequiredMark /></FieldLabel>
          <select
            id="interestedCategoryId"
            name="interestedCategoryId"
            defaultValue={initialInterestedCategoryId ?? ""}
            required
            aria-invalid={Boolean(fieldErrors.interestedCategoryId)}
            className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-foreground/55"
          >
            <option value="" disabled>{labels.selectProduct}</option>
            {categories.map((category) => <option value={category.id} key={category.id}>{category.name}</option>)}
          </select>
          <FieldError>{fieldErrors.interestedCategoryId?.[0]}</FieldError>
        </Field>
        <Field className="sm:col-span-2" data-invalid={Boolean(fieldErrors.requirements)}>
          <FieldLabel htmlFor="requirements">{labels.requirements}<RequiredMark /></FieldLabel>
          <Textarea id="requirements" name="requirements" defaultValue={initialRequirements} required minLength={10} rows={6} aria-invalid={Boolean(fieldErrors.requirements)} />
          <FieldDescription>{labels.requirementsHint}</FieldDescription>
          <FieldError>{fieldErrors.requirements?.[0]}</FieldError>
        </Field>
        <Field className="sm:col-span-2" data-invalid={Boolean(fieldErrors.privacyConsent)}>
          <div className="flex items-center gap-2">
            <Checkbox id="privacy" name="privacyConsent" value="true" required aria-invalid={Boolean(fieldErrors.privacyConsent)} />
            <FieldLabel htmlFor="privacy" className="font-normal leading-6">{labels.privacy}<RequiredMark /></FieldLabel>
          </div>
          <FieldError>{fieldErrors.privacyConsent?.[0]}</FieldError>
        </Field>
        <Field className="sm:col-span-2">
          <Turnstile siteKey={turnstileSiteKey} onToken={onToken} />
          {error ? <FieldError>{error}</FieldError> : null}
          <Button type="submit" size="lg" disabled={pending || !token} className="self-start">
            {pending ? <LoaderCircleIcon data-icon="inline-start" className="animate-spin" /> : null}
            {pending ? labels.sending : labels.submit}
          </Button>
        </Field>
      </FieldGroup>
    </form>
  );
}
