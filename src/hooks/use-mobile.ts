import * as React from "react"

const MOBILE_BREAKPOINT = 768
const mobileQuery = `(max-width: ${MOBILE_BREAKPOINT - 1}px)`

function subscribe(onChange: () => void) {
  const query = window.matchMedia(mobileQuery)
  query.addEventListener("change", onChange)
  return () => query.removeEventListener("change", onChange)
}

export function useIsMobile() {
  // The first client render must match the desktop-shaped server HTML.
  // React reads the real media query after hydration and on breakpoint changes.
  return React.useSyncExternalStore(subscribe, () => window.matchMedia(mobileQuery).matches, () => false)
}
