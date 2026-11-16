"use client";

import Script from "next/script";
import { useEffect, useId, useRef } from "react";

declare global {
  interface Window {
    turnstile?: { render: (element: HTMLElement, options: { sitekey: string; callback: (token: string) => void; "expired-callback": () => void }) => string; remove: (id: string) => void };
  }
}

export function Turnstile({ siteKey, onToken }: { siteKey?: string; onToken: (token: string) => void }) {
  const reactId = useId(); const container = useRef<HTMLDivElement>(null);
  useEffect(() => { if (!siteKey) onToken("demo-mode"); }, [siteKey, onToken]);
  function renderWidget() { if (!siteKey || !container.current || !window.turnstile || container.current.dataset.rendered) return; container.current.dataset.rendered = window.turnstile.render(container.current, { sitekey: siteKey, callback: onToken, "expired-callback": () => onToken("") }); }
  return <><div ref={container} id={`turnstile-${reactId.replaceAll(":", "")}`} /><Script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" strategy="afterInteractive" onLoad={renderWidget} /></>;
}
