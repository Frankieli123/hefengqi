import { requireAdminSession } from "@/lib/admin-session";
import { isGa4Preview } from "@/lib/ga4-preview-auth";

export const dynamic = "force-dynamic";

export default async function Layout({ children }: { children: React.ReactNode }) {
 if (await isGa4Preview("layout")) return children;
 return children;
}
