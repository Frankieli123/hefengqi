"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ShieldCheckIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";

export function TwoFactorForm() {
  const router = useRouter(); const [error, setError] = useState(""); const [pending, setPending] = useState(false);
  async function submit(event: React.FormEvent<HTMLFormElement>) { event.preventDefault(); setPending(true); const data = new FormData(event.currentTarget); const result = await authClient.twoFactor.verifyTotp({ code: String(data.get("code")), trustDevice: false }); setPending(false); if (result.error) return setError("验证码无效或已过期。"); router.push("/admin"); }
  return <form onSubmit={submit} className="w-full rounded-lg border bg-card p-7"><FieldGroup><Field data-invalid={Boolean(error)}><FieldLabel htmlFor="code">身份验证器验证码</FieldLabel><Input id="code" name="code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required aria-invalid={Boolean(error)} /><FieldError>{error}</FieldError></Field><Button type="submit" size="lg" disabled={pending}><ShieldCheckIcon data-icon="inline-start" />{pending ? "正在验证" : "确认验证码"}</Button></FieldGroup></form>;
}
