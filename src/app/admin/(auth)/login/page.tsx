import { AdminBrandMark } from "@/components/brand-mark";
import { LoginForm } from "@/components/admin/login-form";
export const metadata = { title: "后台登录", robots: { index: false, follow: false } };
export default function Page() { return <main className="grid min-h-svh place-items-center bg-muted p-5"><div className="flex w-full max-w-md flex-col items-center gap-7"><AdminBrandMark /><div className="text-center"><h1 className="text-2xl font-semibold">管理后台</h1><p className="mt-2 text-sm text-muted-foreground">仅限已分配账号的管理员与编辑登录</p></div><LoginForm /></div></main>; }
