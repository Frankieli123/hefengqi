"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";

export function SetupTwoFactorForm() {
  const router = useRouter(); const [uri, setUri] = useState(""); const [backupCodes, setBackupCodes] = useState<string[]>([]); const [error, setError] = useState("");
  async function enable(event: React.FormEvent<HTMLFormElement>) { event.preventDefault(); setError(""); const form = new FormData(event.currentTarget); const result = await authClient.twoFactor.enable({ password: String(form.get("password")), method: "totp", issuer: "HEFENGQI" }); if (result.error || !result.data || !("totpURI" in result.data)) return setError("无法启用，请确认密码后重试。"); setUri(result.data.totpURI); setBackupCodes(result.data.backupCodes); }
  async function verify(event: React.FormEvent<HTMLFormElement>) { event.preventDefault(); setError(""); const form = new FormData(event.currentTarget); const result = await authClient.twoFactor.verifyTotp({ code: String(form.get("code")), trustDevice: false }); if (result.error) return setError("验证码不正确。"); router.push("/admin"); router.refresh(); }
  if (!uri) return <form onSubmit={enable}><FieldGroup><Field><FieldLabel htmlFor="password">确认当前密码</FieldLabel><Input id="password" name="password" type="password" autoComplete="current-password" required /></Field>{error ? <FieldError>{error}</FieldError> : null}<Button type="submit">生成 TOTP 密钥</Button></FieldGroup></form>;
  return <div className="flex flex-col gap-6"><Alert><AlertTitle>在身份验证器中添加账号</AlertTitle><AlertDescription><span className="block break-all font-mono text-xs">{uri}</span></AlertDescription></Alert>{backupCodes.length ? <Field><FieldLabel>恢复代码（只显示一次）</FieldLabel><pre className="overflow-x-auto rounded-md bg-muted p-4 text-xs">{backupCodes.join("\n")}</pre><FieldDescription>离线安全保存，不要上传到网站或聊天工具。</FieldDescription></Field> : null}<form onSubmit={verify}><FieldGroup><Field data-invalid={Boolean(error)}><FieldLabel htmlFor="code">验证 6 位代码</FieldLabel><Input id="code" name="code" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} required aria-invalid={Boolean(error)} /><FieldError>{error}</FieldError></Field><Button type="submit">验证并进入后台</Button></FieldGroup></form></div>;
}
