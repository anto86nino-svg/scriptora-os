/**
 * API Resilience Layer
 * - Mutex per-key: prevents duplicate concurrent calls for the same chapter/job.
 * - Circuit breaker: pauses calls after consecutive failures to avoid hammering.
 * - Retry with exponential backoff + jitter.
 */

// =============================================================
// Mutex (per key)
// =============================================================
const inflight = new Map<string, Promise<any>>();

/**
 * Run `fn` exclusively for the given `key`. If another call with the same
 * key is already in flight, return the SAME promise (deduplication).
 */
export function withMutex<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const existing = inflight.get(key);
  if (existing) {
    if (typeof process !== "undefined" && process.env?.NODE_ENV === "development") console.log(`[mutex] Deduped concurrent call for key="${key}"`);
    return existing as Promise<T>;
  }
  const p = (async () => {
    try { return await fn(); }
    finally { inflight.delete(key); }
  })();
  inflight.set(key, p);
  return p;
}

export function isInflight(key: string): boolean {
  return inflight.has(key);
}

// =============================================================
// Circuit breaker
// =============================================================
interface BreakerState {
  failures: number;
  openedAt: number; // 0 = closed
}
const breakers = new Map<string, BreakerState>();

const FAILURE_THRESHOLD = 3;
const FAILURE_WINDOW_MS = 60_000;
const COOLDOWN_MS = 30_000;

export function recordSuccess(serviceKey: string): void {
  breakers.delete(serviceKey);
}

export function recordFailure(serviceKey: string): void {
  const now = Date.now();
  const s = breakers.get(serviceKey);
  if (!s || now - s.openedAt > FAILURE_WINDOW_MS) {
    breakers.set(serviceKey, { failures: 1, openedAt: now });
    return;
  }
  s.failures++;
  if (s.failures >= FAILURE_THRESHOLD) {
    s.openedAt = now;
    console.warn(`[circuit-breaker] OPEN for "${serviceKey}" — pausing for ${COOLDOWN_MS}ms`);
  }
}

/** Returns ms to wait if breaker is open, otherwise 0. */
export function getBreakerCooldown(serviceKey: string): number {
  const s = breakers.get(serviceKey);
  if (!s || s.failures < FAILURE_THRESHOLD) return 0;
  const elapsed = Date.now() - s.openedAt;
  if (elapsed >= COOLDOWN_MS) {
    breakers.delete(serviceKey);
    return 0;
  }
  return COOLDOWN_MS - elapsed;
}

// =============================================================
// Retry with backoff + jitter
// =============================================================

export interface RetryOptions {
  maxAttempts?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  serviceKey?: string;
  shouldRetry?: (err: Error) => boolean;
  onAttempt?: (attempt: number, err: Error | null) => void;
}

function jitter(ms: number): number {
  return ms + Math.floor(Math.random() * (ms * 0.3));
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  opts: RetryOptions = {},
): Promise<T> {
  const {
    maxAttempts = 3,
    baseDelayMs = 2000,
    maxDelayMs = 15000,
    serviceKey,
    shouldRetry = () => true,
    onAttempt,
  } = opts;

  // Honor circuit breaker
  if (serviceKey) {
    const wait = getBreakerCooldown(serviceKey);
    if (wait > 0) {
      throw new Error(`Service paused (circuit breaker). Retry in ${Math.ceil(wait / 1000)}s.`);
    }
  }

  let lastErr: Error = new Error("retry: no attempts made");
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const result = await fn();
      if (serviceKey) recordSuccess(serviceKey);
      onAttempt?.(attempt, null);
      return result;
    } catch (e: any) {
      lastErr = e instanceof Error ? e : new Error(String(e));
      onAttempt?.(attempt, lastErr);
      if (serviceKey) recordFailure(serviceKey);

      const isLast = attempt === maxAttempts;
      if (isLast || !shouldRetry(lastErr)) break;

      const delay = jitter(Math.min(maxDelayMs, baseDelayMs * Math.pow(2, attempt - 1)));
      console.warn(`[retry] Attempt ${attempt} failed (${lastErr.message}). Waiting ${delay}ms before retry ${attempt + 1}/${maxAttempts}.`);
      await new Promise(r => setTimeout(r, delay));
    }
  }
  throw lastErr;
}

// =============================================================
// Debounce helper
// =============================================================

export function debounce<A extends any[]>(
  fn: (...args: A) => void,
  wait: number,
): (...args: A) => void {
  let timer: ReturnType<typeof setTimeout> | null = null;
  return (...args: A) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => { timer = null; fn(...args); }, wait);
  };
}
