import { lazy, type ComponentType, type LazyExoticComponent } from "react";

const CHUNK_RELOAD_PREFIX = "scriptora-chunk-reload:";

export function isChunkLoadError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const msg = error.message.toLowerCase();
  return (
    msg.includes("failed to fetch dynamically imported module") ||
    msg.includes("loading chunk") ||
    msg.includes("importing a module script failed") ||
    msg.includes("dynamically imported module")
  );
}

export function recoverFromChunkLoadError(error: unknown): boolean {
  if (typeof window === "undefined" || !isChunkLoadError(error)) return false;

  const flag = `${CHUNK_RELOAD_PREFIX}${window.location.pathname}`;
  if (sessionStorage.getItem(flag)) {
    sessionStorage.removeItem(flag);
    return false;
  }

  sessionStorage.setItem(flag, "1");
  window.location.reload();
  return true;
}

export function lazyWithRetry<T extends ComponentType<unknown>>(
  importer: () => Promise<{ default: T }>,
): LazyExoticComponent<T> {
  return lazy(() =>
    importer().catch((error) => {
      if (recoverFromChunkLoadError(error)) {
        return new Promise<{ default: T }>(() => {});
      }
      throw error;
    }),
  );
}
