import { AdminShell } from "@/components/admin/admin-shell";
import { requireSecureAdmin } from "@/lib/admin-session";

export const dynamic = "force-dynamic";

export default async function Layout({ children }: { children: React.ReactNode }) { const { user } = await requireSecureAdmin(); return <AdminShell user={user}>{children}</AdminShell>; }
