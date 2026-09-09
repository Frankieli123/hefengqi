"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";

function MediaUpload({ productId }: { productId?: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string }>();

  async function upload(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setPending(true); setResult(undefined);
    try {
      const response = await fetch("/api/admin/media", { method: "POST", body: new FormData(form) });
      const body = await response.json() as { code?: string };
      if (!response.ok) throw new Error(body.code ?? "UPLOAD_REJECTED");
      form.reset();
      setResult({ ok: true, message: productId ? "图片已扫描并关联。发布前仍需管理员确认素材授权。" : "图片已通过安全扫描并进入媒体库，请继续完成授权复核。" });
      router.refresh();
    } catch (error) {
      setResult({ ok: false, message: error instanceof Error ? error.message : "UPLOAD_REJECTED" });
    } finally { setPending(false); }
  }

  const inputId = productId ? "product-media" : "library-media";
  return <form onSubmit={upload}>{productId ? <input type="hidden" name="productId" value={productId} /> : null}<FieldGroup><Field><FieldLabel htmlFor={inputId}>{productId ? "上传产品图片" : "上传到媒体库"}</FieldLabel><Input id={inputId} name="file" type="file" accept="image/jpeg,image/png,image/webp,image/avif" required /><FieldDescription>最大 20 MB；先进入隔离区并通过 Magic Bytes、ClamAV 与图像解码检查。</FieldDescription></Field><div aria-live="polite">{result ? <Alert variant={result.ok ? "default" : "destructive"}><AlertTitle>{result.ok ? "上传完成" : "上传失败"}</AlertTitle><AlertDescription>{result.message}</AlertDescription></Alert> : null}</div><Button type="submit" disabled={pending} className="self-start">{pending ? <Spinner data-icon="inline-start" /> : null}{pending ? "正在安全扫描…" : "上传并扫描"}</Button></FieldGroup></form>;
}

export function ProductMediaUpload({ productId }: { productId: string }) { return <MediaUpload productId={productId} />; }
export function MediaLibraryUpload() { return <MediaUpload />; }
