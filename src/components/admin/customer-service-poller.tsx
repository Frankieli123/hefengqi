"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function CustomerServicePoller() {
  const router = useRouter();
  useEffect(() => {
    const timer = window.setInterval(() => {
      const active = document.activeElement;
      const isWriting = active instanceof HTMLTextAreaElement || active instanceof HTMLInputElement;
      if (document.visibilityState === "visible" && !isWriting) router.refresh();
    }, 5_000);
    return () => window.clearInterval(timer);
  }, [router]);
  return null;
}
