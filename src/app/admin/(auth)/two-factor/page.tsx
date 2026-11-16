import { AdminBrandMark } from "@/components/brand-mark";
import { TwoFactorForm } from "@/components/admin/two-factor-form";
export const metadata = { title: "二次验证", robots: { index: false, follow: false } };
export default function Page() { return <main className="grid min-h-svh place-items-center bg-muted p-5"><div className="flex w-full max-w-md flex-col items-center gap-7"><AdminBrandMark /><div className="text-center"><h1 className="text-2xl font-semibold">二次验证</h1><p className="mt-2 text-sm text-muted-foreground">输入身份验证器生成的 6 位验证码</p></div><TwoFactorForm /></div></main>; }
