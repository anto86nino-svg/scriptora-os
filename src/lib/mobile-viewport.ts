/** Mobile-first viewport detection — prefer matchMedia over userAgent. */
export function isMobileViewport(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(max-width: 768px)").matches;
}

/** Karaoke / auto-scroll is reliable on desktop; mobile uses stable reading mode. */
export function isKaraokeReadingEnabled(): boolean {
  return !isMobileViewport();
}
