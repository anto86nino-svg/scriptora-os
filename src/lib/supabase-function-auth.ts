import { readSupabaseEnv, getSupabaseClient } from "@/integrations/supabase/client";

export function isValidJwtFormat(token: unknown): token is string {
  if (typeof token !== "string") return false;
  const trimmed = token.trim();
  if (trimmed.length < 24) return false;
  const parts = trimmed.split(".");
  return parts.length === 3 && parts.every((part) => part.length > 0);
}

export function isSupabaseJwtAuthError(message: string): boolean {
  return /UNAUTHORIZED_INVALID_JWT|Invalid JWT|invalid JWT|JWT expired|jwt malformed/i.test(message);
}

export function isGenericFunctionHttpError(message: string): boolean {
  return /Edge Function returned a non-2xx|FunctionsHttpError|non-2xx status code/i.test(message);
}

export function parseEdgeFunctionErrorBody(text: string): string {
  const raw = String(text || "").trim();
  if (!raw) return "";
  try {
    const parsed = JSON.parse(raw) as { error?: string; message?: string; code?: string };
    const message = parsed.error || parsed.message || raw;
    if (parsed.code && !String(message).includes(parsed.code)) {
      return `${parsed.code}: ${message}`;
    }
    return String(message);
  } catch {
    return raw;
  }
}

export function formatEdgeFunctionFailure(status: number, bodyText: string): string {
  const clean = parseEdgeFunctionErrorBody(bodyText).trim();

  if (isSupabaseJwtAuthError(clean)) {
    return "Sessione non valida. Esci e accedi di nuovo, poi riprova.";
  }
  if (/DEEPSEEK_API_KEY not configured/i.test(clean)) {
    return "Servizio AI non configurato sul server. Riprova più tardi o contatta il supporto.";
  }
  if (/credits exhausted|API key invalid|DeepSeek credits/i.test(clean)) {
    return clean;
  }
  if (status === 429) return clean || "Troppe richieste. Riprova tra qualche secondo.";
  if (status === 401 || status === 402) return clean || "Credenziali AI o crediti da verificare.";
  if (status >= 500) return clean || "Servizio AI temporaneamente non disponibile. Riprova.";
  if (clean) return clean;
  return `Richiesta al server fallita (${status}). Riprova.`;
}

export function normalizeFunctionErrorMessage(error: unknown): string {
  if (!error) return "Errore sconosciuto.";
  if (typeof error === "string") {
    return isGenericFunctionHttpError(error)
      ? "Il server AI ha risposto con errore. Riprova tra poco."
      : error;
  }

  const err = error as Error & { context?: Response };
  const message = String(err.message || error);

  if (isGenericFunctionHttpError(message)) {
    return "Il server AI ha risposto con errore. Riprova tra poco.";
  }
  if (isSupabaseJwtAuthError(message)) {
    return "Sessione non valida. Esci e accedi di nuovo, poi riprova.";
  }
  return message;
}

/**
 * Headers for Supabase Edge Function calls.
 * Uses the user access token when it looks valid; otherwise falls back to the anon/publishable key.
 */
export async function buildSupabaseFunctionHeaders(
  extra: Record<string, string> = {},
): Promise<Record<string, string>> {
  const { key, edgeAuthKey } = readSupabaseEnv();
  if (!key) {
    throw new Error("Missing Supabase configuration for AI generation.");
  }

  const functionBearer = edgeAuthKey || (isValidJwtFormat(key) ? key : "");
  if (!functionBearer) {
    throw new Error(
      "Chiave Supabase non valida per la generazione AI. Usa la anon JWT (eyJ...) in VITE_SUPABASE_ANON_KEY.",
    );
  }

  let bearer = functionBearer;

  try {
    const { data } = await getSupabaseClient().auth.getSession();
    const token = data.session?.access_token;

    if (isValidJwtFormat(token)) {
      bearer = token;
    } else if (token) {
      console.warn("[Scriptora] Ignoring malformed session token for edge function auth");
      const { data: refreshed, error } = await getSupabaseClient().auth.refreshSession();
      if (!error && isValidJwtFormat(refreshed.session?.access_token)) {
        bearer = refreshed.session!.access_token;
      } else {
        await getSupabaseClient().auth.signOut({ scope: "local" }).catch(() => undefined);
      }
    }
  } catch {
    // Use anon key
  }

  return {
    "Content-Type": "application/json",
    apikey: key,
    Authorization: `Bearer ${bearer}`,
    ...extra,
  };
}

export function resolveEdgeFunctionAuthKey(): string {
  const { key, edgeAuthKey } = readSupabaseEnv();
  if (edgeAuthKey) return edgeAuthKey;
  if (isValidJwtFormat(key)) return key;
  return "";
}

export async function fetchSupabaseFunction(
  path: string,
  init: RequestInit & { json?: unknown } = {},
): Promise<Response> {
  const { url, key } = readSupabaseEnv();
  const edgeAuthKey = resolveEdgeFunctionAuthKey();
  if (!url || !key) {
    throw new Error("Missing Supabase configuration for AI generation.");
  }
  if (!edgeAuthKey) {
    throw new Error(
      "Chiave Supabase non valida per la generazione AI. Incolla la anon JWT (eyJ...) in VITE_SUPABASE_ANON_KEY.",
    );
  }

  const endpoint = `${url.replace(/\/$/, "")}/functions/v1/${path.replace(/^\//, "")}`;
  const { json, headers: extraHeaders, ...rest } = init;
  const body = json !== undefined ? JSON.stringify(json) : init.body;

  const run = async (forceAnon = false): Promise<Response> => {
    const headers = forceAnon
      ? {
          "Content-Type": "application/json",
          apikey: key,
          Authorization: `Bearer ${edgeAuthKey}`,
          ...(extraHeaders as Record<string, string> | undefined),
        }
      : await buildSupabaseFunctionHeaders(extraHeaders as Record<string, string> | undefined);

    return fetch(endpoint, { ...rest, headers, body });
  };

  let res = await run(false);
  if (res.status === 401 || res.status === 403) {
    const text = await res.clone().text().catch(() => "");
    if (isSupabaseJwtAuthError(text)) {
      console.warn("[Scriptora] Edge function JWT rejected — retrying with anon key");
      await getSupabaseClient().auth.signOut({ scope: "local" }).catch(() => undefined);
      res = await run(true);
    }
  }

  return res;
}

type InvokeOptions = {
  body?: unknown;
  method?: string;
  headers?: Record<string, string>;
};

/** Drop-in replacement for supabase.functions.invoke with JWT fallback + readable errors. */
export async function invokeSupabaseFunction<T = unknown>(
  functionName: string,
  options: InvokeOptions = {},
): Promise<{ data: T | null; error: Error | null }> {
  try {
    const res = await fetchSupabaseFunction(functionName, {
      method: options.method || "POST",
      json: options.body,
      headers: options.headers,
    });

    const rawText = await res.text().catch(() => "");

    if (!res.ok) {
      return { data: null, error: new Error(formatEdgeFunctionFailure(res.status, rawText)) };
    }

    if (!rawText) {
      return { data: null as T, error: null };
    }

    const trimmed = rawText.trim();
    if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
      try {
        const parsed = JSON.parse(trimmed) as T & { error?: string };
        if (parsed && typeof parsed === "object" && "error" in parsed && (parsed as { error?: string }).error) {
          return { data: null, error: new Error(String((parsed as { error?: string }).error)) };
        }
        return { data: parsed as T, error: null };
      } catch {
        return { data: rawText as T, error: null };
      }
    }

    return { data: rawText as T, error: null };
  } catch (e) {
    return {
      data: null,
      error: new Error(normalizeFunctionErrorMessage(e)),
    };
  }
}
