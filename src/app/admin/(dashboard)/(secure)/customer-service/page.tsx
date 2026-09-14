import { closeCustomerServiceConversation, sendCustomerServiceReply } from "@/app/admin/actions";
import { requireSecureAdmin } from "@/lib/admin-session";
import { db } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { CustomerServicePoller } from "@/components/admin/customer-service-poller";

export const metadata = { title: "在线客服", robots: { index: false, follow: false } };

type Props = { searchParams: Promise<{ conversation?: string; sent?: string; closed?: string; error?: string }> };

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("zh-CN", { dateStyle: "short", timeStyle: "short" }).format(date);
}

export default async function Page({ searchParams }: Props) {
  await requireSecureAdmin();
  const query = await searchParams;
  const conversations = await db.customerServiceConversation.findMany({
    orderBy: { lastMessageAt: "desc" },
    take: 100,
    include: { messages: { orderBy: { createdAt: "desc" }, take: 1 } },
  });
  const selectedId = query.conversation && conversations.some((item) => item.id === query.conversation) ? query.conversation : conversations[0]?.id;
  const selected = selectedId ? await db.customerServiceConversation.findUnique({ where: { id: selectedId }, include: { messages: { orderBy: { createdAt: "asc" }, take: 200 } } }) : null;

  return <main className="flex min-h-[calc(100vh-3.5rem)] flex-col gap-6 p-5 md:p-8">
    <CustomerServicePoller />
    <div><h1 className="text-2xl font-semibold">在线客服</h1><p className="mt-2 text-sm text-muted-foreground">访客留言会实时进入这里。回复后，访客端会自动刷新显示；关闭会话后仍可查看历史。</p></div>
    {query.sent ? <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">回复已发送。</div> : null}
    {query.closed ? <div className="rounded-lg border bg-muted px-4 py-3 text-sm">会话已结束。</div> : null}
    <div className="grid min-h-[36rem] gap-4 overflow-hidden rounded-xl border bg-card lg:grid-cols-[20rem_minmax(0,1fr)]">
      <aside className="border-b lg:border-b-0 lg:border-r"><div className="border-b px-4 py-3 text-sm font-semibold">最近会话 <span className="ml-1 text-muted-foreground">{conversations.length}</span></div><div className="max-h-[30rem] overflow-y-auto lg:max-h-[calc(100vh-15rem)]">{conversations.length ? conversations.map((conversation) => { const latest = conversation.messages[0]; return <a key={conversation.id} href={`/admin/customer-service?conversation=${conversation.id}`} className={`block border-b px-4 py-3 transition-colors hover:bg-muted/60 ${conversation.id === selectedId ? "bg-muted" : ""}`}><div className="flex items-center justify-between gap-2"><span className="text-xs text-muted-foreground">{conversation.locale.toUpperCase()}</span><Badge variant={conversation.status === "OPEN" ? "default" : "secondary"}>{conversation.status === "OPEN" ? "进行中" : "已结束"}</Badge></div><p className="mt-2 line-clamp-2 text-sm">{latest?.body ?? "暂无消息"}</p><time className="mt-2 block text-xs text-muted-foreground">{formatDate(conversation.lastMessageAt)}</time></a>; }) : <p className="px-4 py-8 text-sm text-muted-foreground">还没有访客会话。</p>}</div></aside>
      <section className="flex min-w-0 flex-col">{selected ? <><div className="flex items-center justify-between gap-4 border-b px-4 py-3"><div><h2 className="font-semibold">访客会话</h2><p className="mt-1 text-xs text-muted-foreground">{selected.id} · {selected.locale.toUpperCase()}</p></div>{selected.status === "OPEN" ? <form action={closeCustomerServiceConversation}><input type="hidden" name="conversationId" value={selected.id} /><Button type="submit" variant="outline" size="sm">结束会话</Button></form> : <Badge variant="secondary">已结束</Badge>}</div><div className="flex-1 space-y-3 overflow-y-auto p-4">{selected.messages.map((message) => <div key={message.id} className={`flex ${message.senderType === "VISITOR" ? "justify-start" : "justify-end"}`}><div className={`max-w-[min(38rem,85%)] rounded-lg px-3 py-2 text-sm leading-6 ${message.senderType === "VISITOR" ? "bg-muted" : message.senderType === "ADMIN" ? "bg-primary text-primary-foreground" : "border bg-background"}`}><p className="whitespace-pre-wrap break-words">{message.body}</p><time className={`mt-1 block text-[11px] ${message.senderType === "ADMIN" ? "text-white/70" : "text-muted-foreground"}`}>{message.senderType === "VISITOR" ? "访客" : message.senderType === "ADMIN" ? "客服" : "系统"} · {formatDate(message.createdAt)}</time></div></div>)}</div><form action={sendCustomerServiceReply} className="border-t p-4"><input type="hidden" name="conversationId" value={selected.id} /><div className="flex flex-col gap-3"><Textarea name="body" required maxLength={2000} rows={3} placeholder="输入给访客的回复…" disabled={selected.status !== "OPEN"} /><Button type="submit" className="self-end" disabled={selected.status !== "OPEN"}>发送回复</Button></div></form></> : <div className="flex flex-1 items-center justify-center p-8 text-sm text-muted-foreground">选择左侧会话开始查看。</div>}</section>
    </div>
  </main>;
}
