"use client";

import { useEffect } from "react";

export function HomeMotion() {
  useEffect(() => {
    const elements = [...document.querySelectorAll<HTMLElement>("[data-reveal]")];
    if (!elements.length) return;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    let observer: IntersectionObserver | undefined;
    const animations = new Set<Animation>();

    function revealAll() { observer?.disconnect(); for (const animation of animations) animation.cancel(); animations.clear(); }

    function initialize() {
      if (media.matches || !("IntersectionObserver" in window)) { revealAll(); return; }
      const candidates = elements.filter((element) => element.getBoundingClientRect().top > window.innerHeight * 0.8);
      observer = new IntersectionObserver((entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const animation = (entry.target as HTMLElement).animate([
            { opacity: 0, transform: "translateY(20px)" },
            { opacity: 1, transform: "translateY(0)" },
          ], { duration: 480, easing: "cubic-bezier(.22, 1, .36, 1)", fill: "both" });
          animations.add(animation);
          animation.finished.finally(() => animations.delete(animation)).catch(() => undefined);
          observer?.unobserve(entry.target);
        }
      }, { threshold: 0.12, rootMargin: "0px 0px -8%" });
      for (const element of candidates) observer.observe(element);
    }

    const frame = requestAnimationFrame(initialize);
    const handleChange = () => { if (media.matches) revealAll(); };
    media.addEventListener("change", handleChange);
    return () => { cancelAnimationFrame(frame); revealAll(); media.removeEventListener("change", handleChange); };
  }, []);

  return null;
}
