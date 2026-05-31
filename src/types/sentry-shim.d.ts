/** Optional peer — install @sentry/react when VITE_SENTRY_DSN is set. */
declare module "@sentry/react" {
  export function init(options: Record<string, unknown>): void;
  export function captureException(error: unknown, context?: Record<string, unknown>): void;
  export function captureMessage(message: string, context?: Record<string, unknown>): void;
}
