import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import type { LiveGenerationRequest, LiveGenerationResult, LiveVariant } from "./types";

const DEFAULT_MODELS = {
  scriptora: process.env.DEEPSEEK_MODEL || "deepseek-chat",
  chatgpt: process.env.OPENAI_MODEL || "gpt-4o-mini",
  claude: process.env.ANTHROPIC_MODEL || "claude-sonnet-4-20250514",
} as const;

function cachePath(key: string): string {
  return resolve(process.cwd(), "benchmark-logs/live-api-cache", `${key}.txt`);
}

function readCache(key: string): string | null {
  const path = cachePath(key);
  if (!existsSync(path)) return null;
  try {
    return readFileSync(path, "utf8");
  } catch {
    return null;
  }
}

function writeCache(key: string, content: string): void {
  const path = cachePath(key);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content, "utf8");
}

async function callOpenAICompatible(input: {
  apiKey: string;
  baseUrl: string;
  model: string;
  systemPrompt: string;
  userPrompt: string;
  maxTokens: number;
  temperature: number;
}): Promise<{ content: string; tokensUsed?: number }> {
  const res = await fetch(`${input.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${input.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: input.model,
      messages: [
        { role: "system", content: input.systemPrompt },
        { role: "user", content: input.userPrompt },
      ],
      max_tokens: input.maxTokens,
      temperature: input.temperature,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`OpenAI-compatible API ${res.status}: ${errText.slice(0, 300)}`);
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
    usage?: { total_tokens?: number };
  };
  const content = data.choices?.[0]?.message?.content?.trim() || "";
  if (!content) throw new Error("Empty response from OpenAI-compatible API");
  return { content, tokensUsed: data.usage?.total_tokens };
}

async function callAnthropic(input: {
  apiKey: string;
  model: string;
  systemPrompt: string;
  userPrompt: string;
  maxTokens: number;
  temperature: number;
}): Promise<{ content: string; tokensUsed?: number }> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": input.apiKey,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: input.model,
      max_tokens: input.maxTokens,
      temperature: input.temperature,
      system: input.systemPrompt,
      messages: [{ role: "user", content: input.userPrompt }],
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Anthropic API ${res.status}: ${errText.slice(0, 300)}`);
  }

  const data = (await res.json()) as {
    content?: Array<{ type: string; text?: string }>;
    usage?: { input_tokens?: number; output_tokens?: number };
  };
  const content = data.content?.find(c => c.type === "text")?.text?.trim() || "";
  if (!content) throw new Error("Empty response from Anthropic API");
  const tokensUsed =
    (data.usage?.input_tokens ?? 0) + (data.usage?.output_tokens ?? 0) || undefined;
  return { content, tokensUsed };
}

export async function generateLiveChapter(
  request: LiveGenerationRequest,
  options?: { cacheKey?: string; useCache?: boolean },
): Promise<LiveGenerationResult> {
  const maxTokens = request.maxTokens ?? 2200;
  const temperature = request.temperature ?? 0.75;
  const cacheKey = options?.cacheKey;

  if (options?.useCache !== false && cacheKey) {
    const cached = readCache(cacheKey);
    if (cached) {
      return {
        variant: request.variant,
        content: cached,
        model: DEFAULT_MODELS[request.variant],
        cached: true,
      };
    }
  }

  try {
    let content: string;
    let tokensUsed: number | undefined;
    let model = DEFAULT_MODELS[request.variant];

    if (request.variant === "claude") {
      const apiKey = process.env.ANTHROPIC_API_KEY!;
      const result = await callAnthropic({
        apiKey,
        model,
        systemPrompt: request.systemPrompt,
        userPrompt: request.userPrompt,
        maxTokens,
        temperature,
      });
      content = result.content;
      tokensUsed = result.tokensUsed;
    } else {
      const apiKey =
        request.variant === "scriptora" ? process.env.DEEPSEEK_API_KEY! : process.env.OPENAI_API_KEY!;
      const baseUrl =
        request.variant === "scriptora"
          ? process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com"
          : process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";
      const result = await callOpenAICompatible({
        apiKey,
        baseUrl,
        model,
        systemPrompt: request.systemPrompt,
        userPrompt: request.userPrompt,
        maxTokens,
        temperature,
      });
      content = result.content;
      tokensUsed = result.tokensUsed;
    }

    if (cacheKey) writeCache(cacheKey, content);

    return { variant: request.variant, content, model, tokensUsed, cached: false };
  } catch (err) {
    return {
      variant: request.variant,
      content: "",
      model: DEFAULT_MODELS[request.variant],
      cached: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export function variantLabel(v: LiveVariant): string {
  return v === "scriptora" ? "Scriptora (DeepSeek + stack)" : v === "chatgpt" ? "ChatGPT live" : "Claude live";
}

export async function delayBetweenCalls(ms = 400): Promise<void> {
  await new Promise(r => setTimeout(r, ms));
}
