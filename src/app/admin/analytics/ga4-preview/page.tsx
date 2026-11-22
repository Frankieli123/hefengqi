import Ga4Page from "@/app/admin/(dashboard)/(secure)/analytics/ga4/page";
import { AdminShell } from "@/components/admin/admin-shell";
import { TooltipProvider } from "@/components/ui/tooltip";
import { requireGa4Preview } from "@/lib/ga4-preview-auth";

export const dynamic = "force-dynamic";
export const metadata = { title: "GA4 只读预览", robots: { index: false, follow: false } };

export default async function PreviewPage({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
 await requireGa4Preview();
 return <TooltipProvider><AdminShell preview><Ga4Page searchParams={searchParams} /></AdminShell></TooltipProvider>;
}
