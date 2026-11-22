import { requireSecureAdmin } from "@/lib/admin-session";
import { normalizeQuery, explore, toCsv, sections } from "@/lib/ga4-reporting";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export async function GET(request:Request) {
 await requireSecureAdmin();
 try {
  const input=Object.fromEntries(new URL(request.url).searchParams),q=normalizeQuery(input);
  const section=input.section?sections.find(s=>s.id===input.section):undefined;
  if(input.section&&!section)throw new Error("invalid_section");
  const dimensions=section?[...section.dimensions]:(input.dimensions??"country").split(",").map(v=>v.trim()).filter(Boolean);
  const metrics=section?[...section.metrics]:(input.metrics??"sessions").split(",").map(v=>v.trim()).filter(Boolean);
  const report=await explore(section?{...q,offset:0}:q,dimensions,metrics);
  return new Response(toCsv(report),{headers:{"Content-Type":"text/csv; charset=utf-8","Content-Disposition":"attachment; filename=ga4-report.csv","Cache-Control":"private, no-store","X-Content-Type-Options":"nosniff"}});
 }catch{return new Response("导出失败：日期、字段组合、权限或 API 不可用。",{status:400,headers:{"Cache-Control":"private, no-store"}});}
}
