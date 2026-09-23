"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { ArrowRightIcon, ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import type { HeroImageSources, HomeHeroSlideView } from "@/types/home-hero";

const slideDuration = 3_000;

function HeroCaption({ slideId, text, delay }: { slideId: string; text: string; delay: number }) {
  const [caption, setCaption] = useState<{ slideId: string; version: number }>({ slideId, version: 0 });

  // Remove the outgoing caption immediately; the incoming caption starts after a short gap.
  if (caption.slideId !== slideId) {
    setCaption({ slideId, version: caption.version + 1 });
  }

  return <span className="home-hero-caption-viewport">
    <span key={`enter-${caption.version}`} className="home-hero-caption" data-entering={caption.version > 0} style={{ "--hero-caption-delay": `${delay}ms` } as CSSProperties}>{text}</span>
  </span>;
}

function HeroPicture({ desktop, mobile, alt, eager }: { desktop: HeroImageSources; mobile?: HeroImageSources; alt: string; eager: boolean }) {
  const style = {
    "--hero-focus-desktop": `${desktop.focusX}% ${desktop.focusY}%`,
    "--hero-focus-mobile": `${mobile?.focusX ?? desktop.focusX}% ${mobile?.focusY ?? desktop.focusY}%`,
  } as CSSProperties;
  return <picture className="home-hero-picture" style={style}>
    {mobile?.avif ? <source media="(max-width: 767px)" type="image/avif" srcSet={mobile.avif} sizes="100vw" /> : null}
    {mobile?.webp ? <source media="(max-width: 767px)" type="image/webp" srcSet={mobile.webp} sizes="100vw" /> : null}
    {mobile?.jpeg ? <source media="(max-width: 767px)" type="image/jpeg" srcSet={mobile.jpeg} sizes="100vw" /> : null}
    {desktop.avif ? <source type="image/avif" srcSet={desktop.avif} sizes="100vw" /> : null}
    {desktop.webp ? <source type="image/webp" srcSet={desktop.webp} sizes="100vw" /> : null}
    <img src={desktop.src} srcSet={desktop.jpeg} sizes="100vw" alt={alt} width={desktop.width} height={desktop.height} loading={eager ? "eager" : "lazy"} fetchPriority={eager ? "high" : "auto"} />
  </picture>;
}

export function HomeHeroCarousel({ slides, labels }: { slides: HomeHeroSlideView[]; labels: { previous: string; next: string; slide: string } }) {
  const [active, setActive] = useState(0);
  const [hovered, setHovered] = useState(false);
  const [focusWithin, setFocusWithin] = useState(false);
  const [touching, setTouching] = useState(false);
  const [documentHidden, setDocumentHidden] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [nextReady, setNextReady] = useState(slides.length <= 1);
  const [timerEpoch, setTimerEpoch] = useState(0);
  const remaining = useRef(slideDuration);
  const timerGeneration = useRef(0);
  const sectionRef = useRef<HTMLElement>(null);
  const touchGesture = useRef<{ startX: number; startY: number; currentX: number; currentY: number } | null>(null);
  const paused = hovered || focusWithin || touching || documentHidden || reducedMotion || !nextReady;

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    const update = () => setDocumentHidden(document.hidden);
    update();
    document.addEventListener("visibilitychange", update);
    return () => document.removeEventListener("visibilitychange", update);
  }, []);

  useEffect(() => {
    if (slides.length <= 1) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const preload = () => {
      timer = setTimeout(async () => {
        const useMobile = window.matchMedia("(max-width: 767px)").matches;
        await Promise.all(slides.slice(1).map(async (slide) => {
          const image = new Image();
          const source = (useMobile ? slide.mobile : undefined) ?? slide.desktop;
          image.srcset = source.webp ?? source.jpeg ?? "";
          image.sizes = "100vw";
          image.src = source.src;
          try { await image.decode(); } catch { /* The visible image still has a native loading fallback. */ }
        }));
        if (!cancelled) setNextReady(true);
      }, 0);
    };
    if (document.readyState === "complete") preload();
    else window.addEventListener("load", preload, { once: true });
    return () => { cancelled = true; if (timer) clearTimeout(timer); window.removeEventListener("load", preload); };
  }, [slides]);

  useEffect(() => {
    if (slides.length <= 1 || paused) return;
    const generation = timerGeneration.current;
    const startedAt = performance.now();
    let completed = false;
    const timer = window.setTimeout(() => {
      completed = true;
      remaining.current = slideDuration;
      setActive((current) => (current + 1) % slides.length);
    }, remaining.current);
    return () => {
      window.clearTimeout(timer);
      if (!completed && generation === timerGeneration.current) remaining.current = Math.max(80, remaining.current - (performance.now() - startedAt));
    };
  }, [active, paused, slides.length, timerEpoch]);

  function goTo(index: number) {
    timerGeneration.current += 1;
    remaining.current = slideDuration;
    setActive((index + slides.length) % slides.length);
    setTimerEpoch((current) => current + 1);
  }

  function handleBlur(event: React.FocusEvent<HTMLElement>) {
    if (!event.currentTarget.contains(event.relatedTarget)) setFocusWithin(false);
  }

  function handleTouchStart(event: React.TouchEvent<HTMLDivElement>) {
    if (slides.length <= 1 || !window.matchMedia("(max-width: 767px)").matches) return;
    const touch = event.touches[0];
    if (!touch) return;
    touchGesture.current = { startX: touch.clientX, startY: touch.clientY, currentX: touch.clientX, currentY: touch.clientY };
    setTouching(true);
  }

  function handleTouchMove(event: React.TouchEvent<HTMLDivElement>) {
    const gesture = touchGesture.current;
    const touch = event.touches[0];
    if (!gesture || !touch) return;
    gesture.currentX = touch.clientX;
    gesture.currentY = touch.clientY;
  }

  function finishTouch(event?: React.TouchEvent<HTMLDivElement>) {
    const gesture = touchGesture.current;
    const touch = event?.changedTouches[0];
    touchGesture.current = null;
    setTouching(false);
    if (!gesture) return;
    const endX = touch?.clientX ?? gesture.currentX;
    const endY = touch?.clientY ?? gesture.currentY;
    const distanceX = endX - gesture.startX;
    const distanceY = endY - gesture.startY;
    const threshold = Math.min(72, Math.max(42, (sectionRef.current?.clientWidth ?? 420) * .1));
    if (Math.abs(distanceX) < threshold || Math.abs(distanceX) <= Math.abs(distanceY) * 1.2) return;
    goTo(active + (distanceX < 0 ? 1 : -1));
  }

  if (!slides.length) return null;

  return <section
    ref={sectionRef}
    className="home-hero"
    style={{ "--hero-slide-duration": `${slideDuration}ms` } as CSSProperties}
    data-paused={paused}
    aria-roledescription="carousel"
    aria-label={labels.slide}
    onMouseEnter={() => setHovered(true)}
    onMouseLeave={() => setHovered(false)}
    onFocus={() => setFocusWithin(true)}
    onBlur={handleBlur}
    onKeyDown={(event) => {
      if (event.key === "ArrowLeft") { event.preventDefault(); goTo(active - 1); }
      if (event.key === "ArrowRight") { event.preventDefault(); goTo(active + 1); }
    }}
  >
    <div className="home-hero-slides" aria-live={paused ? "polite" : "off"} onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={finishTouch} onTouchCancel={() => finishTouch()}>
      {slides.map((slide, index) => <article key={slide.id} className="home-hero-slide" data-dark="true" data-active={index === active} data-content-direction={slide.contentDirection} aria-hidden={index !== active} inert={index === active ? undefined : true} aria-roledescription="slide" aria-label={`${index + 1} / ${slides.length}`}>
        <div className="home-hero-media"><HeroPicture desktop={slide.desktop} mobile={slide.mobile} alt={slide.imageAlt} eager={index === 0} /></div>
        <div className="home-hero-shade" aria-hidden="true" />
        <div className="page-shell home-hero-content" dir="ltr">
          <div className="home-hero-copy" dir={slide.contentDirection}>
            {/* eyebrow removed per design spec */}
            {index === 0 ? <h1 className="home-hero-title home-hero-animate" style={{ "--hero-delay": "70ms" } as CSSProperties}>{slide.title}</h1> : <h2 className="home-hero-title home-hero-animate" style={{ "--hero-delay": "70ms" } as CSSProperties}>{slide.title}</h2>}
            <p className="home-hero-summary home-hero-animate" style={{ "--hero-delay": "140ms" } as CSSProperties}>{slide.summary}</p>
            <div className="flex flex-wrap gap-3 home-hero-animate" style={{ "--hero-delay": "210ms" } as CSSProperties}><Button size="lg" nativeButton={false} render={<Link href={slide.primary.href} />}>{slide.primary.label}<ArrowRightIcon data-icon="inline-end" /></Button>{slide.secondary ? <Button size="lg" variant="outline" nativeButton={false} render={<Link href={slide.secondary.href} />}>{slide.secondary.label}</Button> : null}</div>
          </div>
        </div>
      </article>)}
    </div>
    {slides.length > 1 ? <div className="home-hero-controls">
      <div className="home-hero-control-side home-hero-control-start"><Button type="button" variant="ghost" size="icon" className="home-hero-control" aria-label={labels.previous} onClick={() => goTo(active - 1)}><ChevronLeftIcon /></Button></div>
      <div className="home-hero-pagination" aria-label={`${active + 1} / ${slides.length}`} style={{ "--hero-slide-count": slides.length } as CSSProperties}>
        <i className="home-hero-progress" aria-hidden="true"><b key={`${slides[active].id}-${timerEpoch}`} style={{ animationDuration: `${slideDuration}ms`, animationPlayState: paused ? "paused" : "running" }} /></i>
        {slides.map((_, position) => {
          const index = (active + position) % slides.length;
          const slide = slides[index];
          return <button type="button" key={position} className="home-hero-page" dir={slide.contentDirection} data-active={position === 0} aria-label={`${labels.slide} ${index + 1}: ${slide.eyebrow}`} aria-current={position === 0 ? "true" : undefined} onClick={() => goTo(index)}>
            <HeroCaption slideId={slide.id} text={slide.eyebrow} delay={position === 0 ? 200 : 250} />
          </button>;
        })}
      </div>
      <div className="home-hero-mobile-pagination" aria-label={`${active + 1} / ${slides.length}`} style={{ "--hero-slide-count": slides.length } as CSSProperties}>
        {slides.map((slide, index) => <button type="button" key={slide.id} className="home-hero-mobile-page" data-active={index === active} aria-label={`${labels.slide} ${index + 1}`} aria-current={index === active ? "true" : undefined} onClick={() => goTo(index)}><i aria-hidden="true"><b key={index === active ? timerEpoch : "inactive"} style={{ animationDuration: `${slideDuration}ms`, animationPlayState: paused ? "paused" : "running" }} /></i></button>)}
      </div>
      <div className="home-hero-control-side home-hero-control-end"><Button type="button" variant="ghost" size="icon" className="home-hero-control" aria-label={labels.next} onClick={() => goTo(active + 1)}><ChevronRightIcon /></Button></div>
    </div> : null}
  </section>;
}
