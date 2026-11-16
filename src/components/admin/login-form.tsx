"use client";

import { useRouter } from "next/navigation";
import { useState, useSyncExternalStore } from "react";
import { LoaderCircleIcon, LogInIcon } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";

const subscribeToHydration = () => () => {};

export function LoginForm() {
  const router = useRouter();
  const mounted = useSyncExternalStore(subscribeToHydration, () => true, () => false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!mounted || pending) return;

    setPending(true);
    setError("");
    const data = new FormData(event.currentTarget);

    try {
      const result = await authClient.signIn.email({
        email: String(data.get("email")),
        password: String(data.get("password")),
        callbackURL: "/admin",
      });

      if (result.error) {
        setError("邮箱、密码或二次验证状态不正确。");
        return;
      }

      if (result.data && "twoFactorRedirect" in result.data && result.data.twoFactorRedirect) {
        router.push("/admin/two-factor");
      } else {
        router.push("/admin");
      }
      router.refresh();
    } catch {
      setError("暂时无法连接登录服务，请检查网络后重试。");
    } finally {
      setPending(false);
    }
  }

  return (
    <form method="post" onSubmit={submit} className="w-full rounded-lg border bg-card p-7">
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="email">邮箱</FieldLabel>
          <Input id="email" name="email" type="email" autoComplete="username" required />
        </Field>
        <Field>
          <FieldLabel htmlFor="password">密码</FieldLabel>
          <Input id="password" name="password" type="password" autoComplete="current-password" required minLength={10} />
        </Field>
        {error ? (
          <Alert variant="destructive">
            <AlertTitle>无法登录</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}
        <Field>
          {error ? <FieldError>{error}</FieldError> : null}
          <Button type="submit" size="lg" disabled={!mounted || pending}>
            {pending ? <LoaderCircleIcon className="animate-spin" data-icon="inline-start" /> : <LogInIcon data-icon="inline-start" />}
            {pending ? "正在验证" : mounted ? "登录后台" : "正在载入"}
          </Button>
        </Field>
      </FieldGroup>
    </form>
  );
}
