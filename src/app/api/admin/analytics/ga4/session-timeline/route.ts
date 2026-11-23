import { requireSecureAdmin } from "@/lib/admin-session";
import { getBigQueryActivity } from "@/lib/bigquery-activity";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export async function GET(request:Request){
 try{
  try { await requireSecureAdmin(); } catch { return Response.json({error:"unauthorized"},{status:401,headers:{"Cache-Control":"private, no-store"}}); }
  const url=new URL(request.url),start=url.searchParams.get("start")??"",end=url.searchParams.get("end")??"",session=url.searchParams.get("session")??"",realtime=url.searchParams.get("realtime")==="1";
  if(!/^\d{4}-\d{2}-\d{2}$/.test(start)||!/^\d{4}-\d{2}-\d{2}$/.test(end)||!/^[a-f0-9]{12}$/.test(session))return Response.json({error:"invalid_request"},{status:400,headers:{"Cache-Control":"private, no-store"}});
  const result=await getBigQueryActivity({start,end,session,realtime});
  if(result.status!=="ready")return Response.json({error:result.status},{status:result.status==="unavailable"?503:202,headers:{"Cache-Control":"private, no-store"}});
  return Response.json({events:result.selected?.events??[],hasMore:result.selected?.hasMore??false,coverage:result.coverage??null},{headers:{"Cache-Control":"private, no-store"}});
 }catch{return Response.json({error:"internal"},{status:500,headers:{"Cache-Control":"private, no-store"}});}
}
