export interface AnalyticsSnapshot<T> { value: T; updatedAt: string; stale: boolean }
export function createAnalyticsCache<T>(options: {ttlMs:number;maxStaleMs:number;maxEntries:number;now?:()=>number}) {
 const now = options.now ?? Date.now;
 type Entry = { value?: AnalyticsSnapshot<T>; completedAt?:number; retryAt?:number; pending?:Promise<AnalyticsSnapshot<T>> };
 const entries = new Map<string,Entry>();
 return { async get(key:string, load:()=>Promise<T>):Promise<AnalyticsSnapshot<T>> {
  let entry = entries.get(key);
  if (!entry) {
   if (entries.size >= options.maxEntries) {
    const victim = [...entries].find(([,v])=>!v.pending);
    if (!victim) throw new Error("Analytics cache busy");
    entries.delete(victim[0]);
   }
   entry = {}; entries.set(key,entry);
  }
  const e=entry;
  if (e.pending) return e.pending;
  if (e.value && e.completedAt !== undefined && (now()-e.completedAt < options.ttlMs || (now() < (e.retryAt??0) && now()-e.completedAt <= options.maxStaleMs))) return e.value;
  e.pending = Promise.resolve().then(load).then(value=>{
   e.completedAt=now(); e.retryAt=undefined;
   return e.value={value,updatedAt:new Date(e.completedAt).toISOString(),stale:false};
  }).catch(error=>{
   if(e.value && e.completedAt !== undefined && now()-e.completedAt <= options.maxStaleMs) {
    e.retryAt=now()+options.ttlMs; return e.value={...e.value,stale:true};
   }
   throw error;
  }).finally(()=>{ e.pending=undefined; if(!e.value) entries.delete(key); });
  return e.pending;
 } };
}
