"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { ArrowRightIcon, ChevronRightIcon, SendIcon, XIcon } from "lucide-react";
import type { Locale } from "@/types/domain";

type ChatMessage = { id: string; senderType: "VISITOR" | "ADMIN" | "SYSTEM"; body: string; createdAt: string };
type CustomerServiceConfig = { enabled: boolean; operatorOnline: boolean; whatsapp: string; offlineMessage: string };
type ConversationResponse = CustomerServiceConfig & { id: string; visitorToken?: string; status: "OPEN" | "CLOSED"; messages: ChatMessage[] };
type StoredConversation = { id: string; token: string };

type ChatCopy = {
  buttonLabel: string; brandName: string; onlineLabel: string; offlineLabel: string;
  whatsappCta: string; closeLabel: string;
  inputPlaceholder: string; sendLabel: string; sendingLabel: string; loadingLabel: string; errorLabel: string;
};

const copy: Record<Locale, ChatCopy> = {
  zh: { buttonLabel: "打开在线客服", brandName: "RICEWIND", onlineLabel: "在线", offlineLabel: "离线", whatsappCta: "WhatsApp 咨询", closeLabel: "关闭在线客服", inputPlaceholder: "输入消息…", sendLabel: "发送", sendingLabel: "发送中", loadingLabel: "正在连接客服…", errorLabel: "暂时无法连接，请通过 WhatsApp 联系我们。" },
  en: { buttonLabel: "Open live support", brandName: "RICEWIND", onlineLabel: "Online", offlineLabel: "Offline", whatsappCta: "Chat on WhatsApp", closeLabel: "Close live support", inputPlaceholder: "Type a message…", sendLabel: "Send", sendingLabel: "Sending", loadingLabel: "Connecting to support…", errorLabel: "We cannot connect right now. Please contact us on WhatsApp." },
  ru: { buttonLabel: "Открыть онлайн-поддержку", brandName: "RICEWIND", onlineLabel: "Онлайн", offlineLabel: "Офлайн", whatsappCta: "Написать в WhatsApp", closeLabel: "Закрыть поддержку", inputPlaceholder: "Введите сообщение…", sendLabel: "Отправить", sendingLabel: "Отправка", loadingLabel: "Подключаем поддержку…", errorLabel: "Сейчас подключиться не удалось. Напишите нам в WhatsApp." },
  fr: { buttonLabel: "Ouvrir le support en direct", brandName: "RICEWIND", onlineLabel: "En ligne", offlineLabel: "Hors ligne", whatsappCta: "Discuter sur WhatsApp", closeLabel: "Fermer le support", inputPlaceholder: "Écrivez un message…", sendLabel: "Envoyer", sendingLabel: "Envoi en cours", loadingLabel: "Connexion au support…", errorLabel: "Connexion impossible pour le moment. Veuillez nous contacter via WhatsApp." },
  de: { buttonLabel: "Live-Support öffnen", brandName: "RICEWIND", onlineLabel: "Online", offlineLabel: "Offline", whatsappCta: "Chat auf WhatsApp", closeLabel: "Support schließen", inputPlaceholder: "Nachricht eingeben…", sendLabel: "Senden", sendingLabel: "Wird gesendet", loadingLabel: "Verbindung zum Support wird hergestellt…", errorLabel: "Verbindung derzeit nicht möglich. Bitte kontaktieren Sie uns über WhatsApp." },
  es: { buttonLabel: "Abrir soporte en vivo", brandName: "RICEWIND", onlineLabel: "En línea", offlineLabel: "Desconectado", whatsappCta: "Chat en WhatsApp", closeLabel: "Cerrar soporte", inputPlaceholder: "Escriba un mensaje…", sendLabel: "Enviar", sendingLabel: "Enviando", loadingLabel: "Conectando con soporte…", errorLabel: "No se puede conectar en este momento. Contáctenos por WhatsApp." },
  ar: { buttonLabel: "فتح الدعم المباشر", brandName: "RICEWIND", onlineLabel: "متصل", offlineLabel: "غير متصل", whatsappCta: "المحادثة عبر واتساب", closeLabel: "إغلاق الدعم", inputPlaceholder: "اكتب رسالة…", sendLabel: "إرسال", sendingLabel: "جارٍ الإرسال", loadingLabel: "جارٍ الاتصال بالدعم…", errorLabel: "تعذر الاتصال الآن. يرجى التواصل معنا عبر واتساب." },
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
  const panelRef = useRef<HTMLElement>(null);
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
  useEffect(() => {
    if (!open) return;
    const panel = panelRef.current;
    if (!panel) return;
    const viewport = window.visualViewport;
    const expandedViewportHeight = Math.max(window.innerHeight, viewport?.height ?? 0);
    const pendingTimers = new Set<number>();
    const mobilePanel = window.innerWidth <= 767;
    const lockedScroll = { x: window.scrollX, y: window.scrollY };
    const bodyStyle = {
      left: document.body.style.left,
      overflow: document.body.style.overflow,
      overscrollBehavior: document.body.style.overscrollBehavior,
      position: document.body.style.position,
      top: document.body.style.top,
      width: document.body.style.width,
    };
    const rootStyle = {
      overflow: document.documentElement.style.overflow,
      overscrollBehavior: document.documentElement.style.overscrollBehavior,
    };

    if (mobilePanel) {
      document.documentElement.style.overflow = "hidden";
      document.documentElement.style.overscrollBehavior = "none";
      document.body.style.left = `${-lockedScroll.x}px`;
      document.body.style.overflow = "hidden";
      document.body.style.overscrollBehavior = "none";
      document.body.style.position = "fixed";
      document.body.style.top = `${-lockedScroll.y}px`;
      document.body.style.width = "100%";
    }

    const syncViewport = () => {
      const viewportHeight = Math.max(1, viewport?.height ?? window.innerHeight);
      const viewportTop = Math.max(0, viewport?.offsetTop ?? 0);
      const keyboardInset = Math.max(0, expandedViewportHeight - viewportHeight - viewportTop);
      const viewportReduction = Math.max(0, expandedViewportHeight - viewportHeight);
      const inputFocused = panel.querySelector("textarea:focus") !== null;

      // Floor the origin and ceil the height so fractional viewport pixels overlap
      // instead of exposing a one-pixel strip of the page beside the keyboard.
      panel.style.setProperty("--customer-service-viewport-height", `${Math.ceil(viewportHeight)}px`);
      panel.style.setProperty("--customer-service-viewport-top", `${Math.floor(viewportTop)}px`);
      panel.toggleAttribute("data-keyboard-open", inputFocused && (keyboardInset > 80 || viewportReduction > 80));
    };

    const syncAfterKeyboardTransition = () => {
      for (const timer of pendingTimers) window.clearTimeout(timer);
      pendingTimers.clear();
      syncViewport();
      window.requestAnimationFrame(syncViewport);
      for (const delay of [50, 150, 300, 500]) {
        const timer = window.setTimeout(() => {
          pendingTimers.delete(timer);
          syncViewport();
        }, delay);
        pendingTimers.add(timer);
      }
    };

    syncViewport();
    viewport?.addEventListener("resize", syncViewport);
    viewport?.addEventListener("scroll", syncViewport);
    window.addEventListener("resize", syncViewport);
    panel.addEventListener("focusin", syncAfterKeyboardTransition);
    panel.addEventListener("focusout", syncAfterKeyboardTransition);

    return () => {
      viewport?.removeEventListener("resize", syncViewport);
      viewport?.removeEventListener("scroll", syncViewport);
      window.removeEventListener("resize", syncViewport);
      panel.removeEventListener("focusin", syncAfterKeyboardTransition);
      panel.removeEventListener("focusout", syncAfterKeyboardTransition);
      for (const timer of pendingTimers) window.clearTimeout(timer);
      if (mobilePanel) {
        document.documentElement.style.overflow = rootStyle.overflow;
        document.documentElement.style.overscrollBehavior = rootStyle.overscrollBehavior;
        document.body.style.left = bodyStyle.left;
        document.body.style.overflow = bodyStyle.overflow;
        document.body.style.overscrollBehavior = bodyStyle.overscrollBehavior;
        document.body.style.position = bodyStyle.position;
        document.body.style.top = bodyStyle.top;
        document.body.style.width = bodyStyle.width;
        if (window.scrollX !== lockedScroll.x || window.scrollY !== lockedScroll.y) {
          window.scrollTo(lockedScroll.x, lockedScroll.y);
        }
      }
    };
  }, [open]);

  const sendMessage = useCallback(async (body: string) => {
    if (!conversation || sending || status === "CLOSED") return;
    const trimmed = body.trim(); if (!trimmed) return; setSending(true);
    try { const response = await fetch(`/api/customer-service/conversations/${encodeURIComponent(conversation.id)}/messages`, { method: "POST", headers: requestHeaders(conversation.token), body: JSON.stringify({ body: trimmed }) }); if (!response.ok) throw new Error("message-send-failed"); const created = await response.json() as ChatMessage; setMessages((current) => current.some((item) => item.id === created.id) ? current : [...current, created]); setMessage(""); setFailed(false); } catch { setFailed(true); } finally { setSending(false); }
  }, [conversation, requestHeaders, sending, status]);

  const whatsappHref = useMemo(() => { const number = config.whatsapp.replace(/\D/g, ""); const text = message.trim(); return `https://wa.me/${number}${text ? `?text=${encodeURIComponent(text)}` : ""}`; }, [config.whatsapp, message]);
  const togglePanel = useCallback(() => { if (open) { setOpen(false); return; } setOpen(true); if (!conversation && !loading) void startConversation(); }, [conversation, loading, open, startConversation]);
  if (!config.enabled) return null;

  return <div className={`customer-service ${open ? "is-open" : ""}`}>
    {open ? <section ref={panelRef} id="customer-service-panel" className="customer-service-panel" role="dialog" aria-modal="false" aria-labelledby="customer-service-title">
      <div className="customer-service-viewport">
        <div className="customer-service-header">
          <div className="customer-service-heading" dir="ltr"><Image className="customer-service-brand-logo" src="/brand/hefengqi-mark.png" alt="" aria-hidden width={36} height={36} /><div><h2 id="customer-service-title" translate="no">{labels.brandName}</h2><p dir={locale === "ar" ? "rtl" : "ltr"}><span className={`customer-service-status ${operatorOnline ? "is-online" : ""}`} aria-hidden="true" />{operatorOnline ? labels.onlineLabel : labels.offlineLabel}</p></div></div>
          <button type="button" className="customer-service-close" onClick={() => setOpen(false)} aria-label={labels.closeLabel}><XIcon aria-hidden="true" /></button>
        </div>
        <div className="customer-service-body">
          <div className="customer-service-content">
            {loading ? <p className="customer-service-notice">{labels.loadingLabel}</p> : null}
            {!loading && !operatorOnline ? <div className="customer-service-message-group"><p className="customer-service-message customer-service-message-agent">{offlineMessage}</p></div> : null}
            {messages.length ? <div className="customer-service-thread" ref={messageListRef} aria-live="polite">{messages.map((item, index) => {
              const visitor = item.senderType === "VISITOR";
              const consecutive = messages[index - 1]?.senderType === item.senderType;
              return <div key={item.id} className={`customer-service-message-group ${visitor ? "is-visitor" : "is-agent"}${consecutive ? " is-consecutive" : ""}`}><div className={`customer-service-message ${visitor ? "customer-service-message-visitor" : "customer-service-message-agent"}`}><span>{item.body}</span></div>{index === messages.length - 1 ? <time dateTime={item.createdAt}>{new Intl.DateTimeFormat(locale === "zh" ? "zh-CN" : locale, { hour: "2-digit", minute: "2-digit" }).format(new Date(item.createdAt))}</time> : null}</div>;
            })}</div> : null}
            {failed ? <p className="customer-service-error" role="alert">{labels.errorLabel}</p> : null}
            <form className="customer-service-form" onSubmit={(event) => { event.preventDefault(); void sendMessage(message); }}><div className="customer-service-input-row"><textarea id="customer-service-message" value={message} onChange={(event) => setMessage(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void sendMessage(message); } }} placeholder={labels.inputPlaceholder} rows={2} maxLength={1000} aria-label={labels.inputPlaceholder} disabled={!conversation || sending || status === "CLOSED"} /><button type="submit" aria-label={sending ? labels.sendingLabel : labels.sendLabel} disabled={!conversation || !message.trim() || sending || status === "CLOSED"}><SendIcon aria-hidden="true" /></button></div></form>
          </div>
          <div className="customer-service-channels"><a href={whatsappHref} target="_blank" rel="noopener noreferrer" className="customer-service-contact">{labels.whatsappCta}<ArrowRightIcon aria-hidden="true" /></a></div>
        </div>
      </div>
    </section> : null}
    <button type="button" className="customer-service-trigger" onClick={togglePanel} aria-label={open ? labels.closeLabel : labels.buttonLabel} aria-expanded={open} aria-controls="customer-service-panel">{open ? <ChevronRightIcon className="customer-service-trigger-collapse" aria-hidden="true" strokeWidth={2} /> : <Image className="customer-service-launcher-image" src="/images/customer-service/support-launcher.webp" alt="" width={640} height={445} aria-hidden />}</button>
  </div>;
}
