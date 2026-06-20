export type AiProviderModelId = "deepseek-v4-flash" | "deepseek-v4-pro";

export interface AiProviderModelPricing {
  id: AiProviderModelId;
  displayName: string;
  inputCacheHitUsdPer1M: number;
  inputCacheMissUsdPer1M: number;
  outputUsdPer1M: number;
  contextTokens: number;
  maxOutputTokens: number;
  legacyAliases?: string[];
}

export interface AiProviderPricingConfig {
  provider: "deepseek";
  sourceUrl: string;
  updatedAt: string;
  eurUsdRate: number;
  targetGrossMargin: number;
  retryFailureBuffer: number;
  conservativeCacheHitRate: number;
  models: Record<AiProviderModelId, AiProviderModelPricing>;
}

export const DEFAULT_AI_PROVIDER_PRICING: AiProviderPricingConfig = {
  provider: "deepseek",
  sourceUrl: "https://api-docs.deepseek.com/quick_start/pricing",
  updatedAt: "2026-06-20",
  eurUsdRate: 0.93,
  targetGrossMargin: 0.78,
  retryFailureBuffer: 0.22,
  conservativeCacheHitRate: 0.18,
  models: {
    "deepseek-v4-flash": {
      id: "deepseek-v4-flash",
      displayName: "DeepSeek V4 Flash",
      inputCacheHitUsdPer1M: 0.0028,
      inputCacheMissUsdPer1M: 0.14,
      outputUsdPer1M: 0.28,
      contextTokens: 1_000_000,
      maxOutputTokens: 384_000,
      legacyAliases: ["deepseek-chat"],
    },
    "deepseek-v4-pro": {
      id: "deepseek-v4-pro",
      displayName: "DeepSeek V4 Pro",
      inputCacheHitUsdPer1M: 0.003625,
      inputCacheMissUsdPer1M: 0.435,
      outputUsdPer1M: 0.87,
      contextTokens: 1_000_000,
      maxOutputTokens: 384_000,
      legacyAliases: ["deepseek-reasoner"],
    },
  },
};

export function resolveAiProviderModel(
  model: string | undefined,
  config = DEFAULT_AI_PROVIDER_PRICING,
): AiProviderModelPricing {
  const requested = String(model || "").trim();
  if (requested && requested in config.models) {
    return config.models[requested as AiProviderModelId];
  }
  const byAlias = Object.values(config.models).find((item) =>
    item.legacyAliases?.some((alias) => alias === requested),
  );
  return byAlias || config.models["deepseek-v4-flash"];
}

export function estimateProviderCostEur(inputTokens: number, outputTokens: number, model?: string): number {
  const pricing = DEFAULT_AI_PROVIDER_PRICING;
  const resolved = resolveAiProviderModel(model, pricing);
  const cacheHitRate = Math.max(0, Math.min(1, pricing.conservativeCacheHitRate));
  const cacheMissRate = 1 - cacheHitRate;
  const inputUsd =
    (inputTokens / 1_000_000) *
    (
      resolved.inputCacheHitUsdPer1M * cacheHitRate +
      resolved.inputCacheMissUsdPer1M * cacheMissRate
    );
  const outputUsd = (outputTokens / 1_000_000) * resolved.outputUsdPer1M;
  return (inputUsd + outputUsd) * pricing.eurUsdRate * (1 + pricing.retryFailureBuffer);
}
