import { requireAdminSession } from "@/lib/admin-session";

export const dynamic = "force-dynamic";

export default async function Layout({ children }: { children: React.ReactNode }) { await requireAdminSession(); return children; }
