import { requireSecureAdmin } from "@/lib/admin-session";
import { normalizeQuery, explore, toCsv, sections, type Report } from "@/lib/ga4-reporting";
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
  const visibleReport=(value:Report):Report=>{
   const visible=value.headers.map((header,index)=>header!=="countryId"?index:-1).filter(index=>index>=0);
   return {...value,headers:visible.map(index=>value.headers[index]!),rows:value.rows.map(row=>visible.map(index=>row[index]!)),...(value.compare?{compare:visibleReport(value.compare)}:{})};
  };
  const cleaned=visibleReport(report);
  return new Response(toCsv(cleaned),{headers:{"Content-Type":"text/csv; charset=utf-8","Content-Disposition":"attachment; filename=ga4-report.csv","Cache-Control":"private, no-store","X-Content-Type-Options":"nosniff"}});
 }catch{return new Response("导出失败：日期、字段组合、权限或 API 不可用。",{status:400,headers:{"Cache-Control":"private, no-store"}});}
}
