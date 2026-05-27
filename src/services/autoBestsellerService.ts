/**
 * Auto Bestseller service — wraps SSE streaming + persistence to Supabase.
 */
import { supabase } from "@/integrations/supabase/client";
import type { AuthorIdentity, BookLength } from "@/types/book";

export interface AutoBestsellerInput {
  idea: string;
  genre: string;
  subcategory?: string;
  targetAudience: string;
  tone?: string;
  language?: string;
  titleLanguage?: string;
  numberOfChapters?: number;
  subchaptersEnabled?: boolean;
  subchaptersPerChapter?: number;
  bookLength?: BookLength;
  customTotalWords?: number;
  authorName?: string;
  authorIdentityId?: string;
  authorIdentity?: AuthorIdentity;
  level?: "beginner" | "intermediate" | "advanced";
  readerPromise?: string;
  totalWordTarget?: number;
  prefilledTitle?: string;
  prefilledSubtitle?: string;
  charactersText?: string;
}

export type StageId = "titles" | "market" | "blueprint" | "gono" | "chapters" | "aggregate";
export type StageStatus = "pending" | "running" | "done" | "error";

export interface StageState {
  id: StageId;
  label: string;
  status: StageStatus;
  detail?: string;
  meta?: any;
}

export interface ChapterProgress {
  index: number;
  total: number;
  phase: "writing" | "refining" | "done";
  title: string;
  score?: number;
  voiceConfidence?: number;
  content?: string; // present on phase === "done" — full refined text for live preview
}

export interface RetryEvent {
  attempt: number;
  reason: string;
}

export type BookEvent =
  | { kind: "header"; title: string; subtitle: string }
  | { kind: "blueprint"; title: string; subtitle: string; outlines: Array<{ title: string; summary?: string }> };

export interface AutoBestsellerResult {
  title: string;
  subtitle: string;
  blueprint: any;
  characterBible?: string;
  chapters: Array<{
    title: string;
    content: string;
    coachReport?: any;
    voice?: any;
    rewriteConfidence?: number;
    finalScore?: number;
  }>;
  finalScore: number;
  marketScore: number;
  status: "ready_for_kdp" | "needs_revision" | "failed";
  pipeline: any;
}

export interface SSEHandlers {
  onStage?: (s: StageState) => void;
  onRetry?: (r: RetryEvent) => void;
  onChapter?: (c: ChapterProgress) => void;
  onBook?: (b: BookEvent) => void;
  onDone?: (r: AutoBestsellerResult) => void;
  onError?: (msg: string) => void;
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

/**
 * Run a single bestseller generation with SSE streaming.
 * Returns an AbortController so the caller can cancel.
 */
export function runAutoBestsellerStream(
  input: AutoBestsellerInput,
  handlers: SSEHandlers,
  runId?: string,
): { abort: () => void; promise: Promise<AutoBestsellerResult | null> } {
  const controller = new AbortController();
  // Pass runId so the edge function can persist progress directly to the DB row.
  // This makes the run survive a client disconnect (background generation).
  const payload = btoa(JSON.stringify({ ...input, runId }));
  const url = `${SUPABASE_URL}/functions/v1/auto-bestseller-engine?stream=1&payload=${encodeURIComponent(payload)}&apikey=${PUBLISHABLE_KEY}`;

  const promise = (async (): Promise<AutoBestsellerResult | null> => {
    let result: AutoBestsellerResult | null = null;
    try {
      const resp = await fetch(url, {
        method: "GET",
        headers: { Accept: "text/event-stream", Authorization: `Bearer ${PUBLISHABLE_KEY}` },
        signal: controller.signal,
      });
      if (!resp.ok || !resp.body) {
        const text = await resp.text().catch(() => "stream failed");
        handlers.onError?.(`HTTP ${resp.status}: ${text}`);
        return null;
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        // SSE events are separated by blank line (\n\n)
        let sep: number;
        while ((sep = buffer.indexOf("\n\n")) !== -1) {
          const rawEvent = buffer.slice(0, sep);
          buffer = buffer.slice(sep + 2);
          const evt = parseSSEEvent(rawEvent);
          if (!evt) continue;
          dispatch(evt.event, evt.data, handlers, (r) => { result = r; });
        }
      }
      // flush any trailing event
      if (buffer.trim()) {
        const evt = parseSSEEvent(buffer);
        if (evt) dispatch(evt.event, evt.data, handlers, (r) => { result = r; });
      }
      return result;
    } catch (e: any) {
      if (e?.name === "AbortError") return null;
      handlers.onError?.(e instanceof Error ? e.message : "Stream error");
      return null;
    }
  })();

  return { abort: () => controller.abort(), promise };
}

function parseSSEEvent(raw: string): { event: string; data: any } | null {
  const lines = raw.split("\n").map((l) => (l.endsWith("\r") ? l.slice(0, -1) : l));
  let event = "message";
  const dataLines: string[] = [];
  for (const line of lines) {
    if (!line || line.startsWith(":")) continue;
    if (line.startsWith("event:")) event = line.slice(6).trim();
    else if (line.startsWith("data:")) dataLines.push(line.slice(5).trim());
  }
  if (!dataLines.length) return null;
  try {
    return { event, data: JSON.parse(dataLines.join("\n")) };
  } catch {
    return null;
  }
}

function dispatch(
  event: string,
  data: any,
  handlers: SSEHandlers,
  setResult: (r: AutoBestsellerResult) => void,
) {
  if (event === "stage") {
    handlers.onStage?.({
      id: data.stage,
      label: data.label,
      status: data.status,
      detail: data.detail,
      meta: data.meta,
    });
  } else if (event === "retry") {
    handlers.onRetry?.(data);
  } else if (event === "chapter") {
    handlers.onChapter?.(data);
  } else if (event === "book") {
    handlers.onBook?.(data);
  } else if (event === "done") {
    setResult(data.result);
    handlers.onDone?.(data.result);
  } else if (event === "error") {
    handlers.onError?.(data.message || "Unknown error");
  }
}

// =====================================================================
// Persistence
// =====================================================================

export async function createRunRow(input: AutoBestsellerInput, batchId?: string): Promise<string | null> {
  // Import lazily to avoid a cycle with storageService.
  const { getCurrentUserId } = await import("@/services/storageService");
  const { data, error } = await supabase
    .from("auto_bestseller_runs")
    .select("id")
    .single();
  if (error) {
    console.error("createRunRow failed:", error);
    return null;
  }
  return data.id;
}

export async function updateRunRow(
  id: string,
  patch: { result?: any; progress?: any; status?: string; error?: string; retry_count?: number; final_score?: number; market_score?: number },
) {
  const { error } = await supabase.from("auto_bestseller_runs").update(patch as any).eq("id", id);
  if (error) console.error("updateRunRow failed:", error);
}

export async function fetchRecentRuns(limit = 20) {
  const { data, error } = await supabase
    .from("auto_bestseller_runs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) {
    console.error("fetchRecentRuns failed:", error);
    return [];
  }
  return data || [];
}
