import type { LiveBenchmarkEnvStatus } from "./types";

export function readLiveBenchmarkEnv(): LiveBenchmarkEnvStatus {
  const deepseek = Boolean(process.env.DEEPSEEK_API_KEY?.trim());
  const openai = Boolean(process.env.OPENAI_API_KEY?.trim());
  const anthropic = Boolean(process.env.ANTHROPIC_API_KEY?.trim());
  const ready = deepseek && openai && anthropic;

  return {
    deepseek,
    openai,
    anthropic,
    ready,
    mode: ready ? "live" : "offline",
  };
}

export function missingKeyMessage(env: LiveBenchmarkEnvStatus): string {
  const missing: string[] = [];
  if (!env.deepseek) missing.push("DEEPSEEK_API_KEY (Scriptora stack)");
  if (!env.openai) missing.push("OPENAI_API_KEY (ChatGPT live)");
  if (!env.anthropic) missing.push("ANTHROPIC_API_KEY (Claude live)");
  return `Live API benchmark blocked. Set: ${missing.join(", ")}`;
}

export function isSmokeMode(): boolean {
  if (process.env.LIVE_BENCHMARK_FULL === "1" || process.env.LIVE_BENCHMARK_FULL === "true") return false;
  return process.env.LIVE_BENCHMARK_SMOKE !== "0" && process.env.LIVE_BENCHMARK_SMOKE !== "false";
}
