import { requireSecureAdmin } from "@/lib/admin-session";
import { getBigQueryActivity } from "@/lib/bigquery-activity";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export async function GET(request:Request){
 try{
  await requireSecureAdmin();
  const url=new URL(request.url),start=url.searchParams.get("start")??"",end=url.searchParams.get("end")??"",session=url.searchParams.get("session")??"";
  if(!/^\d{4}-\d{2}-\d{2}$/.test(start)||!/^\d{4}-\d{2}-\d{2}$/.test(end)||!/^[a-f0-9]{12}$/.test(session))return Response.json({error:"invalid_request"},{status:400,headers:{"Cache-Control":"private, no-store"}});
  const result=await getBigQueryActivity({start,end,session});
  if(result.status!=="ready")return Response.json({error:result.status},{status:result.status==="unavailable"?503:202,headers:{"Cache-Control":"private, no-store"}});
  return Response.json({events:result.selected?.events??[]},{headers:{"Cache-Control":"private, no-store"}});
 }catch{return Response.json({error:"unavailable"},{status:401,headers:{"Cache-Control":"private, no-store"}});}
}
