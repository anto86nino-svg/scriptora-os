export const GENERATION_AUTH_ERROR_MESSAGE =
  "Sessione scaduta o non valida. Accedi di nuovo per continuare la generazione.";

export class GenerationAuthError extends Error {
  readonly code = "GENERATION_AUTH_REQUIRED";
  readonly status = 401;

  constructor(message: string = GENERATION_AUTH_ERROR_MESSAGE, cause?: unknown) {
    super(message);
    this.name = "GenerationAuthError";
    if (cause !== undefined) (this as Error & { cause?: unknown }).cause = cause;
  }
}

type AuthFailure = { message?: string } | null;

export interface GenerationSessionLike {
  access_token?: string | null;
  expires_at?: number;
  user?: { id?: string | null } | null;
}

interface SessionResult {
  data: { session: GenerationSessionLike | null };
  error: AuthFailure;
}

/** Minimal structural type so the helper can be tested without a real Supabase client. */
export interface GenerationAuthClient {
  getSession: () => Promise<SessionResult>;
  refreshSession: () => Promise<SessionResult>;
}

export interface GenerationAuthContext {
  accessToken: string;
  userId: string;
  expiresAt?: number;
}

export interface GenerationAuthFetchResult {
  response: Response;
  session: GenerationAuthContext;
  refreshedAfterUnauthorized: boolean;
}

const DEFAULT_MIN_TTL_SECONDS = 60;

function toAuthContext(session: GenerationSessionLike | null): GenerationAuthContext | null {
  const accessToken = session?.access_token?.trim();
  const userId = session?.user?.id?.trim();
  if (!accessToken || !userId) return null;
  return {
    accessToken,
    userId,
    expiresAt: session?.expires_at,
  };
}

function expiresSoon(
  context: GenerationAuthContext,
  nowSeconds: number,
  minTtlSeconds: number,
): boolean {
  return typeof context.expiresAt === "number"
    && context.expiresAt <= nowSeconds + minTtlSeconds;
}

export async function refreshGenerationSession(
  auth: GenerationAuthClient,
): Promise<GenerationAuthContext> {
  let result: SessionResult;
  try {
    result = await auth.refreshSession();
  } catch (cause) {
    throw new GenerationAuthError(undefined, cause);
  }

  const context = toAuthContext(result.data?.session ?? null);
  if (result.error || !context) {
    throw new GenerationAuthError(undefined, result.error ?? undefined);
  }
  return context;
}

/**
 * Resolve a real user JWT before generation. A public/anon API key is never a
 * substitute for an authenticated session: credit-protected generation tasks
 * reject it after an otherwise successful chapter start.
 */
export async function requireGenerationSession(
  auth: GenerationAuthClient,
  options: { nowSeconds?: number; minTtlSeconds?: number } = {},
): Promise<GenerationAuthContext> {
  const nowSeconds = options.nowSeconds ?? Math.floor(Date.now() / 1000);
  const minTtlSeconds = options.minTtlSeconds ?? DEFAULT_MIN_TTL_SECONDS;

  let result: SessionResult | null = null;
  try {
    result = await auth.getSession();
  } catch {
    // A refresh below can still recover a temporarily stale persisted session.
  }

  const context = toAuthContext(result?.data?.session ?? null);
  if (!result?.error && context && !expiresSoon(context, nowSeconds, minTtlSeconds)) {
    return context;
  }

  return refreshGenerationSession(auth);
}

async function discardUnauthorizedResponse(response: Response): Promise<void> {
  try {
    await response.body?.cancel();
  } catch {
    // Consuming the first 401 body is only resource cleanup; never hide auth recovery.
  }
}

/**
 * Execute one authenticated request. A 401 gets exactly one forced refresh and
 * one replay. A second 401 becomes a typed, actionable auth error.
 */
export async function fetchWithGenerationAuth(
  auth: GenerationAuthClient,
  request: (session: GenerationAuthContext, authAttempt: 1 | 2) => Promise<Response>,
): Promise<GenerationAuthFetchResult> {
  let session = await requireGenerationSession(auth);
  let response = await request(session, 1);

  if (response.status !== 401) {
    return { response, session, refreshedAfterUnauthorized: false };
  }

  await discardUnauthorizedResponse(response);
  session = await refreshGenerationSession(auth);
  response = await request(session, 2);

  if (response.status === 401) {
    await discardUnauthorizedResponse(response);
    throw new GenerationAuthError();
  }

  return { response, session, refreshedAfterUnauthorized: true };
}
