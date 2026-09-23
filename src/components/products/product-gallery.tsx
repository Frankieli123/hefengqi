"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { ProductVisual } from "@/components/product-visual";
import type { ProductImageView } from "@/types/domain";
import { cn } from "@/lib/utils";

const ZOOM_FACTOR = 1.8;
const DEFAULT_FLYOUT_SIZE = 400;
const SWIPE_THRESHOLD = 36;
const SYNTHETIC_MOUSE_GUARD_MS = 700;

type TouchGesture = {
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
};

export function ProductGallery({ images, model }: { images: ProductImageView[]; model: string }) {
  const visibleImages = images.slice(0, 5);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [lensPos, setLensPos] = useState({ left: 0, top: 0, width: 0, height: 0 });
  const [containerDimensions, setContainerDimensions] = useState({ width: 0, height: 0 });
  const [flyoutDimensions, setFlyoutDimensions] = useState({ width: DEFAULT_FLYOUT_SIZE, height: DEFAULT_FLYOUT_SIZE });

  const containerRef = useRef<HTMLDivElement>(null);
  const touchGestureRef = useRef<TouchGesture | null>(null);
  const ignoreMouseUntilRef = useRef(0);
  const activeImage = visibleImages[activeIndex] ?? visibleImages[0];

  if (!activeImage) return <ProductVisual model={model} className="rounded-none" />;

  const isAtRightEdge =
    containerDimensions.width > 0 &&
    lensPos.width > 0 &&
    lensPos.left >= containerDimensions.width - lensPos.width - 1;

  const updateLensPosition = (clientX: number, clientY: number) => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cW = rect.width || 480;
    const cH = rect.height || 480;
    const flyoutW = Math.min(DEFAULT_FLYOUT_SIZE, cW);
    const flyoutH = Math.min(DEFAULT_FLYOUT_SIZE, cH);
    const lensW = flyoutW / ZOOM_FACTOR;
    const lensH = flyoutH / ZOOM_FACTOR;

    const mouseX = clientX - rect.left;
    const mouseY = clientY - rect.top;

    const left = Math.max(0, Math.min(cW - lensW, mouseX - lensW / 2));
    const top = Math.max(0, Math.min(cH - lensH, mouseY - lensH / 2));

    setContainerDimensions({ width: cW, height: cH });
    setFlyoutDimensions({ width: flyoutW, height: flyoutH });
    setLensPos({ left, top, width: lensW, height: lensH });
  };

  const handleMouseEnter = (e: React.MouseEvent<HTMLDivElement>) => {
    if (touchGestureRef.current || Date.now() < ignoreMouseUntilRef.current) return;
    updateLensPosition(e.clientX, e.clientY);
    setIsActive(true);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (touchGestureRef.current || Date.now() < ignoreMouseUntilRef.current) return;
    updateLensPosition(e.clientX, e.clientY);
    if (!isActive) setIsActive(true);
  };

  const handleMouseLeave = () => {
    setIsActive(false);
  };

  const handleTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    const touch = event.touches[0];
    if (!touch) return;

    touchGestureRef.current = {
      startX: touch.clientX,
      startY: touch.clientY,
      currentX: touch.clientX,
      currentY: touch.clientY,
    };
    ignoreMouseUntilRef.current = Date.now() + SYNTHETIC_MOUSE_GUARD_MS;
    setIsActive(false);
  };

  const handleTouchMove = (event: React.TouchEvent<HTMLDivElement>) => {
    const gesture = touchGestureRef.current;
    const touch = event.touches[0];
    if (!gesture || !touch) return;

    gesture.currentX = touch.clientX;
    gesture.currentY = touch.clientY;
  };

  const finishTouch = (event?: React.TouchEvent<HTMLDivElement>) => {
    const gesture = touchGestureRef.current;
    const touch = event?.changedTouches[0];
    touchGestureRef.current = null;
    ignoreMouseUntilRef.current = Date.now() + SYNTHETIC_MOUSE_GUARD_MS;
    setIsActive(false);

    if (!gesture || visibleImages.length <= 1) return;

    const distanceX = (touch?.clientX ?? gesture.currentX) - gesture.startX;
    const distanceY = (touch?.clientY ?? gesture.currentY) - gesture.startY;
    if (Math.abs(distanceX) < SWIPE_THRESHOLD || Math.abs(distanceX) <= Math.abs(distanceY)) return;

    setActiveIndex((current) =>
      distanceX < 0
        ? (current + 1) % visibleImages.length
        : (current - 1 + visibleImages.length) % visibleImages.length
    );
  };

  const cancelTouch = () => {
    touchGestureRef.current = null;
    ignoreMouseUntilRef.current = Date.now() + SYNTHETIC_MOUSE_GUARD_MS;
    setIsActive(false);
  };

  const mainImage = <div
    ref={containerRef}
    className="group relative aspect-square cursor-crosshair touch-pan-y overflow-hidden rounded-none bg-white select-none"
    onMouseEnter={handleMouseEnter}
    onMouseMove={handleMouseMove}
    onMouseLeave={handleMouseLeave}
    onTouchStart={handleTouchStart}
    onTouchMove={handleTouchMove}
    onTouchEnd={finishTouch}
    onTouchCancel={cancelTouch}
    data-zoomed={isActive ? "true" : undefined}
    data-testid="product-gallery-main"
  >
    <Image key={activeImage.src} src={activeImage.src} alt={activeImage.alt} width={activeImage.width} height={activeImage.height} sizes="(max-width: 1024px) 100vw, 50vw" className="size-full animate-in fade-in object-contain pointer-events-none duration-200 motion-reduce:animate-none" priority />
    {isActive && lensPos.width > 0 ? <div
      className={cn("pointer-events-none absolute rounded-none border border-black/[0.06] bg-white/20 dark:border-white/10 dark:bg-black/20", isAtRightEdge && "border-r-0")}
      style={{ left: `${lensPos.left}px`, top: `${lensPos.top}px`, width: `${lensPos.width}px`, height: `${lensPos.height}px` }}
      data-testid="magnifier-lens"
    /> : null}
  </div>;

  return (
    <div className="relative flex min-w-0 flex-col gap-3">
      {/* Main Image Container */}
      {mainImage}

      {/* Flyout Magnifier Window to the Right (Huawei VMALL style) */}
      {isActive && containerDimensions.width > 0 ? (
        <div
          className="pointer-events-none absolute left-full -ml-px top-0 z-50 hidden aspect-square overflow-hidden rounded-none border border-border/40 bg-background lg:block"
          style={{
            width: `${flyoutDimensions.width}px`,
            height: `${flyoutDimensions.height}px`,
          }}
          data-testid="magnifier-flyout"
        >
          <div className="relative size-full overflow-hidden bg-white">
            <div
              className="absolute left-0 top-0 will-change-transform"
              style={{
                width: `${containerDimensions.width * ZOOM_FACTOR}px`,
                height: `${containerDimensions.height * ZOOM_FACTOR}px`,
                transform: `translate3d(${-lensPos.left * ZOOM_FACTOR}px, ${-lensPos.top * ZOOM_FACTOR}px, 0)`,
              }}
            >
              <Image
                src={activeImage.src}
                alt={activeImage.alt}
                width={activeImage.width}
                height={activeImage.height}
                sizes="1200px"
                className="size-full object-contain"
                priority
              />
            </div>
          </div>
        </div>
      ) : null}

      {/* Thumbnails */}
      {visibleImages.length > 1 ? (
        <div
          className="flex max-w-full items-center gap-2 overflow-x-auto overflow-y-hidden pt-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:gap-3"
          aria-label="Product images"
        >
          {visibleImages.map((image, index) => {
            const isCurrent = index === activeIndex;
            return (
              <button
                key={`${image.src}-${index}`}
                type="button"
                className="group flex shrink-0 flex-col items-center gap-1.5 focus:outline-none"
                aria-label={`${index + 1} / ${visibleImages.length}: ${image.alt}`}
                aria-current={isCurrent ? "true" : undefined}
                onMouseEnter={() => {
                  setActiveIndex(index);
                  setIsActive(false);
                }}
                onFocus={() => {
                  setActiveIndex(index);
                  setIsActive(false);
                }}
                onClick={() => {
                  setActiveIndex(index);
                  setIsActive(false);
                }}
              >
                <div
                  className={cn(
                    "size-[3.25rem] min-[390px]:size-[3.5rem] shrink-0 overflow-hidden rounded-none border bg-white transition-colors sm:size-[4.5rem]",
                    isCurrent ? "border-border" : "border-transparent hover:border-border/60"
                  )}
                >
                  <Image
                    src={image.src}
                    alt=""
                    width={image.width}
                    height={image.height}
                    sizes="72px"
                    className="size-full object-contain pointer-events-none"
                  />
                </div>
                {/* Red indicator capsule underneath (Huawei VMALL style) */}
                <span
                  className={cn(
                    "h-1 w-6 sm:w-8 rounded-full transition-all duration-150",
                    isCurrent ? "bg-primary opacity-100" : "bg-transparent opacity-0"
                  )}
                  aria-hidden="true"
                />
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
