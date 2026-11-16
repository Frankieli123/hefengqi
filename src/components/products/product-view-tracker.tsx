"use client";

import { useEffect } from "react";

export function ProductViewTracker({ productId }: { productId: string }) {
  useEffect(() => {
    if (!productId) return;
    try {
      if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
        const url = `/api/products/${encodeURIComponent(productId)}/view`;
        const blob = new Blob([], { type: "application/json" });
        if (navigator.sendBeacon(url, blob)) {
          return;
        }
      }
      fetch(`/api/products/${encodeURIComponent(productId)}/view`, {
        method: "POST",
        keepalive: true,
      }).catch(() => {});
    } catch {
      // ignore client errors
    }
  }, [productId]);

  return null;
}
