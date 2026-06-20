export type UserFriendlyErrorArea =
  | "study"
  | "manuscript"
  | "payment"
  | "blueprint"
  | "upload"
  | "generic";

export interface UserFriendlyErrorInput {
  area?: UserFriendlyErrorArea;
  fallback?: string;
  language?: "it" | "en" | "es" | "fr" | "de";
}

const TECHNICAL_ERROR_PATTERN =
  /\b(provider|api|network|failed|failure|undefined|null|stack|trace|json|500|502|503|504|cors|supabase|stripe|lemon|deepseek|openrouter|rate limited|credits exhausted|ip non raggiunto|generation failed|cannot read properties)\b/i;

const DEFAULT_MESSAGES: Record<UserFriendlyErrorArea, string> = {
  study: "Ho preparato una versione rapida utilizzabile. Puoi rigenerarla quando vuoi.",
  manuscript: "Non sono riuscito a completare l'analisi al primo tentativo. Il testo resta salvato: puoi riprovare senza perdere nulla.",
  payment: "Il checkout reale non è ancora attivo in questa build. La selezione è stata salvata.",
  blueprint: "Blueprint non completato. Ho salvato il lavoro e puoi riprovare senza perdere i dati.",
  upload: "Non sono riuscito a leggere questo file. Prova con TXT, MD, DOCX, PDF o incolla il testo.",
  generic: "Non sono riuscito a completare l'operazione al primo tentativo. Ho salvato il lavoro e puoi riprovare.",
};

export function containsTechnicalErrorText(value: unknown): boolean {
  return TECHNICAL_ERROR_PATTERN.test(String(value ?? ""));
}

export function getUserFriendlyError(error: unknown, input: UserFriendlyErrorInput = {}): string {
  const area = input.area || "generic";
  const fallback = input.fallback || DEFAULT_MESSAGES[area];
  const raw = error instanceof Error ? error.message : String(error ?? "");
  const clean = raw.replace(/\s+/g, " ").trim();

  if (!clean || containsTechnicalErrorText(clean)) return fallback;
  if (clean.length > 180) return fallback;
  return clean;
}

export function localizeUserError(error: unknown, input: UserFriendlyErrorInput = {}): string {
  // The app UI is currently Italian-first; keep the public fallback stable and
  // non-technical even when browser/provider errors arrive in another language.
  return getUserFriendlyError(error, input);
}

export function safeParseStorage<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    const parsed = JSON.parse(raw);
    return parsed as T;
  } catch {
    return fallback;
  }
}

export async function safeAsyncAction<T>(
  action: () => Promise<T>,
  fallback: T | (() => T),
  onError?: (error: unknown) => void,
): Promise<T> {
  try {
    return await action();
  } catch (error) {
    onError?.(error);
    return typeof fallback === "function" ? (fallback as () => T)() : fallback;
  }
}

export function fallbackResultFactory<T>(factory: () => T, onError?: (error: unknown) => void): T | null {
  try {
    return factory();
  } catch (error) {
    onError?.(error);
    return null;
  }
}

export function devOnlyDiagnostic(label: string, data?: unknown): void {
  if (typeof import.meta !== "undefined" && import.meta.env?.PROD) return;
  try {
    const enabled =
      typeof localStorage !== "undefined" &&
      localStorage.getItem("scriptora-dev-diagnostics") === "1";
    if (enabled) console.info(`[Scriptora diagnostic] ${label}`, data);
  } catch {
    // Diagnostics must never affect product flow.
  }
}
