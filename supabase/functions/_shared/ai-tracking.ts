// Shared AI call layer with token tracking + cost calculation
// All Edge Functions should route DeepSeek calls through this module.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

// ===== PRICING (USD per token) =====
// DeepSeek official pricing checked on 2026-05-20:
// https://api-docs.deepseek.com/quick_start/pricing/
// DeepSeek returns prompt_cache_hit_tokens / prompt_cache_miss_tokens in usage.
type TokenPricing = {
  inputCacheHit: number;
  inputCacheMiss: number;
  output: number;
  sourceLabel?: string;
};

const perMillion = (usd: number) => usd / 1_000_000;

export const AI_PRICING: Record<string, Record<string, TokenPricing>> = {
  deepseek: {
    // Compatibility aliases. DeepSeek docs map deepseek-chat / deepseek-reasoner
    // to DeepSeek-V4-Flash non-thinking / thinking modes.
    "deepseek-chat": {
      inputCacheHit: perMillion(0.0028),
      inputCacheMiss: perMillion(0.14),
      output: perMillion(0.28),
      sourceLabel: "DeepSeek V4 Flash",
    },
    "deepseek-reasoner": {
      inputCacheHit: perMillion(0.0028),
      inputCacheMiss: perMillion(0.14),
      output: perMillion(0.28),
      sourceLabel: "DeepSeek V4 Flash thinking",
    },
    "deepseek-v4-flash": {
      inputCacheHit: perMillion(0.0028),
      inputCacheMiss: perMillion(0.14),
      output: perMillion(0.28),
      sourceLabel: "DeepSeek V4 Flash",
    },
    // Promo price published by DeepSeek, extended until 2026-05-31 15:59 UTC.
    "deepseek-v4-pro": {
      inputCacheHit: perMillion(0.003625),
      inputCacheMiss: perMillion(0.435),
      output: perMillion(0.87),
      sourceLabel: "DeepSeek V4 Pro promo",
    },
  },
};

export interface CostBreakdown {
  inputCost: number;
  outputCost: number;
  totalCost: number;
}

export function calculateCost(
  provider: string,
  model: string,
  promptTokens: number,
  completionTokens: number,
  promptCacheHitTokens?: number,
  promptCacheMissTokens?: number
): CostBreakdown {
  const p = AI_PRICING[provider]?.[model];
  if (!p) return { inputCost: 0, outputCost: 0, totalCost: 0 };
  const cacheHitTokens = Math.max(0, promptCacheHitTokens ?? 0);
  const cacheMissTokens = Math.max(0, promptCacheMissTokens ?? Math.max(0, promptTokens - cacheHitTokens));
  const inputCost = (cacheHitTokens * p.inputCacheHit) + (cacheMissTokens * p.inputCacheMiss);
  const outputCost = completionTokens * p.output;
  return { inputCost, outputCost, totalCost: inputCost + outputCost };
}

// Rough token estimator (≈ 4 chars/token for english/italian)
export function estimateTokens(text: string): number {
  if (!text) return 0;
  return Math.ceil(text.length / 4);
}

export interface UsageLogInput {
  provider: string;
  model: string;
  taskType: string;
  promptTokens: number;
  completionTokens: number;
  promptCacheHitTokens?: number;
  promptCacheMissTokens?: number;
  projectId?: string | null;
  userId?: string | null;
  metadata?: Record<string, unknown>;
}

// Fire-and-forget logging — never blocks or throws
export async function logAIUsage(input: UsageLogInput): Promise<void> {
  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!SUPABASE_URL || !SERVICE_KEY) return;

    const totalTokens = input.promptTokens + input.completionTokens;
    const { inputCost, outputCost, totalCost } = calculateCost(
      input.provider,
      input.model,
      input.promptTokens,
      input.completionTokens,
      input.promptCacheHitTokens,
      input.promptCacheMissTokens
    );
    const pricing = AI_PRICING[input.provider]?.[input.model];

    const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    await supabase.from("ai_usage_logs").insert({
      user_id: input.userId || "local-user-free",
      project_id: input.projectId || null,
      provider: input.provider,
      model: input.model,
      task_type: input.taskType,
      prompt_tokens: input.promptTokens,
      completion_tokens: input.completionTokens,
      total_tokens: totalTokens,
      input_cost: inputCost,
      output_cost: outputCost,
      total_cost: totalCost,
      metadata: {
        ...(input.metadata || {}),
        prompt_cache_hit_tokens: input.promptCacheHitTokens ?? null,
        prompt_cache_miss_tokens: input.promptCacheMissTokens ?? null,
        pricing_source: pricing?.sourceLabel || null,
        pricing_checked_at: "2026-05-20",
      },
    });
  } catch (e) {
    console.error("[ai-tracking] log failed (silent):", e instanceof Error ? e.message : e);
  }
}

// ===== Unified DeepSeek caller with auto-tracking =====
export interface CallDeepSeekParams {
  apiKey: string;
  systemPrompt: string;
  userPrompt: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  jsonMode?: boolean;
  taskType: string;
  projectId?: string | null;
  userId?: string | null;
  metadata?: Record<string, unknown>;
}

export interface CallDeepSeekResult {
  content: string;
  usage: {
    promptTokens: number;
    promptCacheHitTokens: number;
    promptCacheMissTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  cost: CostBreakdown;
}

export async function callDeepSeekTracked(
  params: CallDeepSeekParams
): Promise<CallDeepSeekResult> {
  const model = params.model || "deepseek-chat";
  const body: Record<string, unknown> = {
    model,
    messages: [
      { role: "system", content: params.systemPrompt },
      { role: "user", content: params.userPrompt },
    ],
    temperature: params.temperature ?? 0.7,
    max_tokens: params.maxTokens ?? 4000,
  };
  if (params.jsonMode) body.response_format = { type: "json_object" };

  const r = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${params.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!r.ok) {
    const text = await r.text().catch(() => "");
    const err: Error & { status?: number } = new Error(`DeepSeek ${r.status}: ${text}`);
    err.status = r.status;
    throw err;
  }

  const data = await r.json();
  const content: string = data.choices?.[0]?.message?.content || "";
  const usage = data.usage || {};
  const promptTokens =
    typeof usage.prompt_tokens === "number"
      ? usage.prompt_tokens
      : estimateTokens(params.systemPrompt + params.userPrompt);
  const promptCacheHitTokens =
    typeof usage.prompt_cache_hit_tokens === "number"
      ? usage.prompt_cache_hit_tokens
      : 0;
  const promptCacheMissTokens =
    typeof usage.prompt_cache_miss_tokens === "number"
      ? usage.prompt_cache_miss_tokens
      : promptTokens;
  const completionTokens =
    typeof usage.completion_tokens === "number"
      ? usage.completion_tokens
      : estimateTokens(content);
  const totalTokens = promptTokens + completionTokens;
  const cost = calculateCost("deepseek", model, promptTokens, completionTokens, promptCacheHitTokens, promptCacheMissTokens);

  // fire-and-forget
  logAIUsage({
    provider: "deepseek",
    model,
    taskType: params.taskType,
    promptTokens,
    completionTokens,
    promptCacheHitTokens,
    promptCacheMissTokens,
    projectId: params.projectId,
    userId: params.userId,
    metadata: params.metadata,
  });

  return { content, usage: { promptTokens, promptCacheHitTokens, promptCacheMissTokens, completionTokens, totalTokens }, cost };
}
