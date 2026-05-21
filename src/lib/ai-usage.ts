// Client-side helpers to query AI cost & token usage from ai_usage_logs.
// All edge functions log into this table via supabase/functions/_shared/ai-tracking.ts.

import { supabase } from "@/integrations/supabase/client";
import { isDevMode } from "@/lib/dev-mode";
import { loadProjects as loadLocalProjects } from "@/lib/storage";
import { getCurrentUserId } from "@/services/storageService";
import type { BookProject } from "@/types/book";

export interface UsageRow {
  id: string;
  user_id: string;
  project_id: string | null;
  provider: string;
  model: string;
  task_type: string;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  input_cost: number;
  output_cost: number;
  total_cost: number;
  metadata?: Record<string, unknown> | null;
  created_at: string;
}

export interface UsageSummary {
  totalTokens: number;
  totalCost: number;
  inputCost: number;
  outputCost: number;
  callsCount: number;
  byTask: Record<string, { tokens: number; cost: number; calls: number }>;
  byProvider: Record<string, { tokens: number; cost: number; calls: number }>;
}

let lastUsageError: string | null = null;

export function getUsageDiagnostics(): string | null {
  return lastUsageError;
}

export const DEEPSEEK_PRICING_NOTE = {
  checkedAt: "2026-05-20",
  sourceUrl: "https://api-docs.deepseek.com/quick_start/pricing/",
  flash: {
    cacheHitInputPerMillion: 0.0028,
    cacheMissInputPerMillion: 0.14,
    outputPerMillion: 0.28,
  },
  proPromo: {
    cacheHitInputPerMillion: 0.003625,
    cacheMissInputPerMillion: 0.435,
    outputPerMillion: 0.87,
    validUntilUtc: "2026-05-31 15:59",
  },
} as const;

function currentUsageUserIds(): string[] {
  const current = getCurrentUserId();
  const ids = isDevMode()
    ? [current, "local-user", "local-user-free", "local-user-beta", "local-user-pro", "public-user"]
    : [current];
  return [...new Set(ids.filter(Boolean))];
}

function onlyDeepSeek(rows: UsageRow[]): UsageRow[] {
  return rows.filter((row) => String(row.provider || "").toLowerCase() === "deepseek");
}

function countWordsInText(text: unknown): number {
  if (typeof text !== "string") return 0;
  const normalized = text
    .replace(/<[^>]+>/g, " ")
    .replace(/[’']/g, "'")
    .trim();
  if (!normalized) return 0;
  return normalized.split(/\s+/).filter((word) => /[\p{L}\p{N}]/u.test(word)).length;
}

function countWordsInValue(value: unknown): number {
  if (!value) return 0;
  if (typeof value === "string") return countWordsInText(value);
  if (Array.isArray(value)) return value.reduce((sum, item) => sum + countWordsInValue(item), 0);
  if (typeof value === "object") {
    return Object.values(value as Record<string, unknown>).reduce((sum, item) => sum + countWordsInValue(item), 0);
  }
  return 0;
}

function countProjectRealWords(project: BookProject): number {
  let total = 0;
  total += countWordsInText(project.config?.title);
  total += countWordsInText(project.config?.subtitle);
  total += countWordsInValue(project.frontMatter);
  total += countWordsInValue(project.backMatter);
  for (const chapter of project.chapters || []) {
    total += countWordsInText(chapter.title);
    total += countWordsInText(chapter.content);
    for (const subchapter of chapter.subchapters || []) {
      total += countWordsInText(subchapter.title);
      total += countWordsInText(subchapter.content);
    }
  }
  return total;
}

function estimateDeepSeekTokensFromWords(words: number): number {
  // Real Scriptora word count -> practical DeepSeek token estimate.
  // English/Italian prose usually lands around 1.25-1.45 tokens per word.
  return Math.ceil(Math.max(0, words) * 1.35);
}

function getScriptoraWordRows(projectId?: string | null): UsageRow[] {
  try {
    const userIds = currentUsageUserIds();
    const projects = loadLocalProjects();
    const rows = projects
      .filter((project) => !projectId || project.id === projectId)
      .filter((project) => {
        if (isDevMode()) return true;
        const owner = String((project as any).userId || "");
        return !owner || userIds.includes(owner);
      })
      .map((project) => {
        const words = countProjectRealWords(project);
        const estimatedTokens = estimateDeepSeekTokensFromWords(words);
        const owner = String((project as any).userId || getCurrentUserId());
        return {
          id: `scriptora-real-words-${project.id}`,
          user_id: owner,
          project_id: project.id,
          provider: "deepseek",
          model: "deepseek-chat",
          task_type: "scriptora_real_words",
          prompt_tokens: 0,
          completion_tokens: estimatedTokens,
          total_tokens: estimatedTokens,
          input_cost: 0,
          output_cost: estimatedTokens * DEEPSEEK_PRICING_NOTE.flash.outputPerMillion / 1_000_000,
          total_cost: estimatedTokens * DEEPSEEK_PRICING_NOTE.flash.outputPerMillion / 1_000_000,
          metadata: {
            source: "scriptora_real_words",
            estimated: true,
            real_word_count: words,
            words_to_tokens_ratio: 1.35,
            project_title: project.config?.title || "Untitled",
          },
          created_at: project.updatedAt || project.createdAt || new Date().toISOString(),
        } satisfies UsageRow;
      })
      .filter((row) => row.total_tokens > 0)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return rows;
  } catch {
    return [];
  }
}

function useScriptoraWordFallback(projectId?: string | null): UsageRow[] {
  const rows = getScriptoraWordRows(projectId);
  lastUsageError = rows.length > 0
    ? "SCRIPTORA_WORDS: conteggio stimato dalle parole reali salvate nei libri Scriptora."
    : "SCRIPTORA_WORDS: nessun testo salvato nei libri Scriptora da conteggiare.";
  return rows;
}

async function fetchUsageViaEdge(input: {
  userIds?: string[];
  projectId?: string | null;
  recentLimit?: number;
  summaryLimit?: number;
}): Promise<{ summaryRows: UsageRow[]; recentRows: UsageRow[] } | null> {
  try {
    const { data, error } = await supabase.functions.invoke("ai-usage-summary", {
      body: {
        userIds: input.userIds || [],
        projectId: input.projectId || null,
        recentLimit: input.recentLimit || 50,
        summaryLimit: input.summaryLimit || 1000,
      },
    });

    if (error) throw new Error(error.message || "ai-usage-summary unavailable");
    if ((data as any)?.error) throw new Error((data as any).error);

    lastUsageError = null;
    return {
      summaryRows: onlyDeepSeek(((data as any)?.summaryRows || []) as UsageRow[]),
      recentRows: onlyDeepSeek(((data as any)?.recentRows || []) as UsageRow[]),
    };
  } catch (e) {
    lastUsageError = e instanceof Error ? e.message : "ai-usage-summary unavailable";
    return null;
  }
}

function summarize(rows: UsageRow[]): UsageSummary {
  const aiRows = onlyDeepSeek(rows);
  const summary: UsageSummary = {
    totalTokens: 0,
    totalCost: 0,
    inputCost: 0,
    outputCost: 0,
    callsCount: aiRows.length,
    byTask: {},
    byProvider: {},
  };
  for (const r of aiRows) {
    const displayCost = getUsageRowCost(r);
    const inputCost = r.provider === "deepseek" ? Math.max(0, displayCost - getDeepSeekOutputCost(r)) : Number(r.input_cost) || 0;
    const outputCost = r.provider === "deepseek" ? getDeepSeekOutputCost(r) : Number(r.output_cost) || 0;
    summary.totalTokens += Number(r.total_tokens) || 0;
    summary.totalCost += displayCost;
    summary.inputCost += inputCost;
    summary.outputCost += outputCost;
    const t = (summary.byTask[r.task_type] ||= { tokens: 0, cost: 0, calls: 0 });
    t.tokens += Number(r.total_tokens) || 0;
    t.cost += displayCost;
    t.calls += 1;
    const p = (summary.byProvider[r.provider] ||= { tokens: 0, cost: 0, calls: 0 });
    p.tokens += Number(r.total_tokens) || 0;
    p.cost += displayCost;
    p.calls += 1;
  }
  return summary;
}

function deepSeekModelPricing(model: string) {
  const normalized = String(model || "").toLowerCase();
  if (normalized.includes("v4-pro")) return DEEPSEEK_PRICING_NOTE.proPromo;
  return DEEPSEEK_PRICING_NOTE.flash;
}

function metadataNumber(row: UsageRow, key: string): number | null {
  const raw = row.metadata?.[key];
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}

function getDeepSeekOutputCost(row: UsageRow): number {
  if (row.provider !== "deepseek") return Number(row.output_cost) || 0;
  const pricing = deepSeekModelPricing(row.model);
  return (Number(row.completion_tokens) || 0) * pricing.outputPerMillion / 1_000_000;
}

export function getUsageRowCost(row: UsageRow): number {
  if (row.provider !== "deepseek") return Number(row.total_cost) || 0;
  const pricing = deepSeekModelPricing(row.model);
  const promptTokens = Number(row.prompt_tokens) || 0;
  const hitTokens = Math.max(0, metadataNumber(row, "prompt_cache_hit_tokens") ?? 0);
  const missTokens = Math.max(0, metadataNumber(row, "prompt_cache_miss_tokens") ?? Math.max(0, promptTokens - hitTokens));
  const completionTokens = Number(row.completion_tokens) || 0;
  return (
    (hitTokens * pricing.cacheHitInputPerMillion / 1_000_000) +
    (missTokens * pricing.cacheMissInputPerMillion / 1_000_000) +
    (completionTokens * pricing.outputPerMillion / 1_000_000)
  );
}

export async function getProjectUsage(projectId: string): Promise<UsageSummary> {
  const edge = await fetchUsageViaEdge({ projectId, recentLimit: 1, summaryLimit: 1000 });
  if (edge && edge.summaryRows.length > 0) return summarize(edge.summaryRows);
  if (edge) {
    const fallbackRows = useScriptoraWordFallback(projectId);
    if (fallbackRows.length > 0) return summarize(fallbackRows);
    return summarize(edge.summaryRows);
  }

  const { data, error } = await supabase
    .from("ai_usage_logs" as any)
    .select("*")
    .eq("project_id", projectId)
    .eq("provider", "deepseek")
    .order("created_at", { ascending: false })
    .limit(1000);
  if (error) {
    console.error("[ai-usage] getProjectUsage error", error);
    lastUsageError = error.message;
    return summarize(useScriptoraWordFallback(projectId));
  }
  lastUsageError = null;
  const rows = (data as unknown as UsageRow[]) || [];
  if (rows.length > 0) return summarize(rows);
  const fallbackRows = useScriptoraWordFallback(projectId);
  return summarize(fallbackRows);
}

export async function getUserUsage(userId?: string): Promise<UsageSummary> {
  const userIds = userId ? [userId] : currentUsageUserIds();
  const edge = await fetchUsageViaEdge({ userIds, recentLimit: 1, summaryLimit: 1000 });
  if (edge && edge.summaryRows.length > 0) return summarize(edge.summaryRows);
  if (edge) {
    const fallbackRows = useScriptoraWordFallback();
    if (fallbackRows.length > 0) return summarize(fallbackRows);
    return summarize(edge.summaryRows);
  }

  const { data, error } = await supabase
    .from("ai_usage_logs" as any)
    .select("*")
    .in("user_id", userIds)
    .eq("provider", "deepseek")
    .order("created_at", { ascending: false })
    .limit(1000);
  if (error) {
    console.error("[ai-usage] getUserUsage error", error);
    lastUsageError = error.message;
    return summarize(useScriptoraWordFallback());
  }
  lastUsageError = null;
  const rows = (data as unknown as UsageRow[]) || [];
  if (rows.length > 0) return summarize(rows);
  const fallbackRows = useScriptoraWordFallback();
  return summarize(fallbackRows);
}

export async function getRecentUsage(limit = 50): Promise<UsageRow[]> {
  const userIds = currentUsageUserIds();
  const edge = await fetchUsageViaEdge({ userIds, recentLimit: limit, summaryLimit: 1 });
  if (edge && edge.recentRows.length > 0) return edge.recentRows;
  if (edge) {
    const fallbackRows = useScriptoraWordFallback();
    if (fallbackRows.length > 0) return fallbackRows.slice(0, limit);
    return edge.recentRows;
  }

  const { data, error } = await supabase
    .from("ai_usage_logs" as any)
    .select("*")
    .in("user_id", userIds)
    .eq("provider", "deepseek")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) {
    console.error("[ai-usage] getRecentUsage error", error);
    lastUsageError = error.message;
    return useScriptoraWordFallback().slice(0, limit);
  }
  lastUsageError = null;
  const rows = onlyDeepSeek((data as unknown as UsageRow[]) || []);
  if (rows.length > 0) return rows;
  return useScriptoraWordFallback().slice(0, limit);
}

export function formatCost(cost: number): string {
  if (cost >= 1) return `$${cost.toFixed(2)}`;
  if (cost >= 0.01) return `$${cost.toFixed(3)}`;
  if (cost > 0 && cost < 0.00001) return `$${cost.toFixed(8)}`;
  return `$${cost.toFixed(5)}`;
}

export function formatTokens(tokens: number): string {
  if (tokens >= 1_000_000) return `${(tokens / 1_000_000).toFixed(2)}M`;
  if (tokens >= 1_000) return `${(tokens / 1_000).toFixed(1)}k`;
  return `${tokens}`;
}
