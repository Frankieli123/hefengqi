import { AdminShell } from "@/components/admin/admin-shell";
import { TooltipProvider } from "@/components/ui/tooltip";
import { requireSecureAdmin } from "@/lib/admin-session";
import { isGa4Preview } from "@/lib/ga4-preview-auth";

export const dynamic = "force-dynamic";

export default async function Layout({ children }: { children: React.ReactNode }) {
 if (await isGa4Preview("layout")) return <TooltipProvider><AdminShell preview>{children}</AdminShell></TooltipProvider>;
 const { user } = await requireSecureAdmin();
 return <TooltipProvider><AdminShell user={user}>{children}</AdminShell></TooltipProvider>;
}
