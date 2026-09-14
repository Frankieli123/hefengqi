"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowRightIcon, MessageCircleIcon, SendIcon, XIcon } from "lucide-react";
import type { Locale } from "@/types/domain";

type ChatMessage = { id: string; senderType: "VISITOR" | "ADMIN" | "SYSTEM"; body: string; createdAt: string };
type CustomerServiceConfig = { enabled: boolean; operatorOnline: boolean; whatsapp: string; offlineMessage: string };
type ConversationResponse = CustomerServiceConfig & { id: string; visitorToken?: string; status: "OPEN" | "CLOSED"; messages: ChatMessage[] };
type StoredConversation = { id: string; token: string };

type ChatCopy = {
  buttonLabel: string; panelTitle: string; onlineLabel: string; offlineLabel: string;
  whatsappCta: string; closeLabel: string;
  inputPlaceholder: string; sendLabel: string; sendingLabel: string; loadingLabel: string; errorLabel: string; agentLabel: string; visitorLabel: string;
};

const copy: Record<Locale, ChatCopy> = {
  zh: { buttonLabel: "打开在线客服", panelTitle: "在线客服", onlineLabel: "客服在线，可直接发送消息", offlineLabel: "当前离线，可留言", whatsappCta: "WhatsApp 咨询", closeLabel: "关闭在线客服", inputPlaceholder: "输入消息…", sendLabel: "发送", sendingLabel: "发送中", loadingLabel: "正在连接客服…", errorLabel: "暂时无法连接，请通过 WhatsApp 联系我们。", agentLabel: "RICEWIND 客服", visitorLabel: "您" },
  en: { buttonLabel: "Open live support", panelTitle: "Live support", onlineLabel: "Support is online — send us a message", offlineLabel: "Currently offline — leave a message", whatsappCta: "Chat on WhatsApp", closeLabel: "Close live support", inputPlaceholder: "Type a message…", sendLabel: "Send", sendingLabel: "Sending", loadingLabel: "Connecting to support…", errorLabel: "We cannot connect right now. Please contact us on WhatsApp.", agentLabel: "RICEWIND Support", visitorLabel: "You" },
  ru: { buttonLabel: "Открыть онлайн-поддержку", panelTitle: "Онлайн-поддержка", onlineLabel: "Специалист онлайн — отправьте сообщение", offlineLabel: "Сейчас офлайн — оставьте сообщение", whatsappCta: "Написать в WhatsApp", closeLabel: "Закрыть поддержку", inputPlaceholder: "Введите сообщение…", sendLabel: "Отправить", sendingLabel: "Отправка", loadingLabel: "Подключаем поддержку…", errorLabel: "Сейчас подключиться не удалось. Напишите нам в WhatsApp.", agentLabel: "Поддержка RICEWIND", visitorLabel: "Вы" },
};

function storageKey(locale: Locale) { return `ricewind-customer-service:${locale}`; }

export function OnlineCustomerService({ locale, config }: { locale: Locale; config: CustomerServiceConfig }) {
  const labels = copy[locale];
  const [open, setOpen] = useState(false);
  const [conversation, setConversation] = useState<StoredConversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [status, setStatus] = useState<"OPEN" | "CLOSED">("OPEN");
  const [operatorOnline, setOperatorOnline] = useState(config.operatorOnline);
  const [offlineMessage, setOfflineMessage] = useState(config.offlineMessage);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [failed, setFailed] = useState(false);
  const messageListRef = useRef<HTMLDivElement>(null);

  const requestHeaders = useCallback((token: string) => ({ "Content-Type": "application/json", "x-customer-service-token": token }), []);
  const applyConversation = useCallback((data: ConversationResponse) => { setMessages(data.messages); setStatus(data.status); setOperatorOnline(data.operatorOnline); setOfflineMessage(data.offlineMessage); setFailed(false); }, []);

  const startConversation = useCallback(async () => {
    setLoading(true);
    try {
      const savedRaw = window.localStorage.getItem(storageKey(locale));
      const saved = savedRaw ? JSON.parse(savedRaw) as StoredConversation : null;
      if (saved?.id && saved?.token) {
        const restored = await fetch(`/api/customer-service/conversations/${encodeURIComponent(saved.id)}`, { headers: requestHeaders(saved.token), cache: "no-store" });
        if (restored.ok) { const data = await restored.json() as ConversationResponse; setConversation(saved); applyConversation(data); return; }
        window.localStorage.removeItem(storageKey(locale));
      }
      const response = await fetch("/api/customer-service/conversations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ locale }) });
      if (!response.ok) throw new Error("conversation-create-failed");
      const data = await response.json() as ConversationResponse;
      if (!data.visitorToken) throw new Error("conversation-token-missing");
      const next = { id: data.id, token: data.visitorToken };
      window.localStorage.setItem(storageKey(locale), JSON.stringify(next)); setConversation(next); applyConversation(data);
    } catch { setFailed(true); } finally { setLoading(false); }
  }, [applyConversation, locale, requestHeaders]);

  useEffect(() => {
    if (!open || !conversation) return;
    const update = async () => { if (document.visibilityState !== "visible") return; try { const response = await fetch(`/api/customer-service/conversations/${encodeURIComponent(conversation.id)}`, { headers: requestHeaders(conversation.token), cache: "no-store" }); if (response.ok) applyConversation(await response.json() as ConversationResponse); } catch { /* Keep the current thread during a transient network error. */ } };
    const timer = window.setInterval(() => void update(), 4_000); return () => window.clearInterval(timer);
  }, [applyConversation, conversation, open, requestHeaders]);
  useEffect(() => { messageListRef.current?.scrollTo({ top: messageListRef.current.scrollHeight, behavior: "smooth" }); }, [messages]);

  const sendMessage = useCallback(async (body: string) => {
    if (!conversation || sending || status === "CLOSED") return;
    const trimmed = body.trim(); if (!trimmed) return; setSending(true);
    try { const response = await fetch(`/api/customer-service/conversations/${encodeURIComponent(conversation.id)}/messages`, { method: "POST", headers: requestHeaders(conversation.token), body: JSON.stringify({ body: trimmed }) }); if (!response.ok) throw new Error("message-send-failed"); const created = await response.json() as ChatMessage; setMessages((current) => current.some((item) => item.id === created.id) ? current : [...current, created]); setMessage(""); setFailed(false); } catch { setFailed(true); } finally { setSending(false); }
  }, [conversation, requestHeaders, sending, status]);

  const whatsappHref = useMemo(() => { const number = config.whatsapp.replace(/\D/g, ""); const text = message.trim(); return `https://wa.me/${number}${text ? `?text=${encodeURIComponent(text)}` : ""}`; }, [config.whatsapp, message]);
  const togglePanel = useCallback(() => { if (open) { setOpen(false); return; } setOpen(true); if (!conversation && !loading) void startConversation(); }, [conversation, loading, open, startConversation]);
  if (!config.enabled) return null;

  return <div className={`customer-service ${open ? "is-open" : ""}`}>
    {open ? <section id="customer-service-panel" className="customer-service-panel" role="dialog" aria-modal="false" aria-labelledby="customer-service-title">
      <header className="customer-service-header">
        <div className="customer-service-heading"><span className="customer-service-avatar" aria-hidden="true"><MessageCircleIcon /></span><div><h2 id="customer-service-title">{labels.panelTitle}</h2><p><span className={`customer-service-status ${operatorOnline ? "is-online" : ""}`} aria-hidden="true" />{operatorOnline ? labels.onlineLabel : labels.offlineLabel}</p></div></div>
        <button type="button" className="customer-service-close" onClick={() => setOpen(false)} aria-label={labels.closeLabel}><XIcon aria-hidden="true" /></button>
      </header>
      <div className="customer-service-body">
        {loading ? <p className="customer-service-notice">{labels.loadingLabel}</p> : null}
        {!loading && !operatorOnline ? <div className="customer-service-message-group"><p className="customer-service-message customer-service-message-agent">{offlineMessage}</p></div> : null}
        {messages.length ? <div className="customer-service-thread" ref={messageListRef} aria-live="polite">{messages.map((item) => {
          const visitor = item.senderType === "VISITOR";
          return <div key={item.id} className={`customer-service-message-group ${visitor ? "is-visitor" : "is-agent"}`}><div className={`customer-service-message ${visitor ? "customer-service-message-visitor" : "customer-service-message-agent"}`}><span>{item.body}</span></div><time dateTime={item.createdAt}>{visitor ? labels.visitorLabel : labels.agentLabel} · {new Intl.DateTimeFormat(locale === "zh" ? "zh-CN" : locale, { hour: "2-digit", minute: "2-digit" }).format(new Date(item.createdAt))}</time></div>;
        })}</div> : null}
        {failed ? <p className="customer-service-error" role="alert">{labels.errorLabel}</p> : null}
        <div className="customer-service-channels"><a href={whatsappHref} target="_blank" rel="noopener noreferrer" className="customer-service-contact">{labels.whatsappCta}<ArrowRightIcon aria-hidden="true" /></a></div>
        <form className="customer-service-form" onSubmit={(event) => { event.preventDefault(); void sendMessage(message); }}><div className="customer-service-input-row"><textarea id="customer-service-message" value={message} onChange={(event) => setMessage(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void sendMessage(message); } }} placeholder={labels.inputPlaceholder} rows={2} maxLength={1000} aria-label={labels.inputPlaceholder} disabled={!conversation || sending || status === "CLOSED"} /><button type="submit" aria-label={sending ? labels.sendingLabel : labels.sendLabel} disabled={!conversation || !message.trim() || sending || status === "CLOSED"}><SendIcon aria-hidden="true" /></button></div></form>
      </div>
    </section> : null}
    <button type="button" className="customer-service-trigger" onClick={togglePanel} aria-label={open ? labels.closeLabel : labels.buttonLabel} aria-expanded={open} aria-controls="customer-service-panel"><MessageCircleIcon aria-hidden="true" /></button>
  </div>;
}
