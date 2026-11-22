import { redirect } from "next/navigation";
import { isGa4Preview } from "@/lib/ga4-preview-auth";

export const dynamic = "force-dynamic";
export default async function Page() {
 if (!(await isGa4Preview())) redirect("/admin/login");
 redirect("/admin/analytics/ga4?preview=1");
}
