"use client";

import { useEffect, useRef, useState } from "react";

export function SiteHeaderFrame({ children }: { children: React.ReactNode }) {
  const [hidden, setHidden] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const lastY = useRef(0);
  const directionStart = useRef(0);
  const direction = useRef<"up" | "down" | null>(null);

  useEffect(() => {
    lastY.current = window.scrollY;
    directionStart.current = window.scrollY;

    function updateHeader() {
      const currentY = Math.max(0, window.scrollY);
      const nextDirection = currentY > lastY.current ? "down" : currentY < lastY.current ? "up" : direction.current;
      setScrolled(currentY > 8);

      if (currentY <= 24) {
        setHidden(false);
        direction.current = null;
        directionStart.current = currentY;
      } else if (nextDirection && nextDirection !== direction.current) {
        direction.current = nextDirection;
        directionStart.current = lastY.current;
      }

      if (nextDirection === "down" && currentY - directionStart.current >= 20) setHidden(true);
      if (nextDirection === "up" && directionStart.current - currentY >= 12) setHidden(false);
      lastY.current = currentY;
    }

    window.addEventListener("scroll", updateHeader, { passive: true });
    return () => window.removeEventListener("scroll", updateHeader);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.siteHeader = hidden ? "hidden" : "visible";
    return () => { delete document.documentElement.dataset.siteHeader; };
  }, [hidden]);

  return (
    <header
      className="site-header border-b border-border/70 bg-background/95"
      data-scroll-state={hidden ? "hidden" : scrolled ? "scrolled" : "top"}
      onFocusCapture={() => setHidden(false)}
      style={{ viewTransitionName: "site-header" }}
    >
      {children}
    </header>
  );
}
