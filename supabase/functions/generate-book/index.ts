import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { logAIUsage, estimateTokens } from "../_shared/ai-tracking.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function jsonResponse(payload: Record<string, unknown>, status: number) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function publicErrorMessage(status: number): string {
  if (status === 429) return "Rate limited. Please wait a moment and try again.";
  if (status === 402 || status === 401) return "DeepSeek API key invalid or credits exhausted. Check your API key.";
  if (status >= 500) return "AI provider temporarily unavailable. Please try again.";
  return `AI provider rejected the request (${status}).`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  try {
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return jsonResponse({ error: "Invalid JSON request body." }, 400);
    }

    const {
      systemPrompt,
      userPrompt,
      taskType = "generate_book",
      projectId = null,
      userId = null,
      metadata = {},
    } = body;
    if (typeof systemPrompt !== "string" || typeof userPrompt !== "string" || !systemPrompt.trim() || !userPrompt.trim()) {
      return jsonResponse({ error: "Missing systemPrompt or userPrompt." }, 400);
    }

    const DEEPSEEK_API_KEY = Deno.env.get("DEEPSEEK_API_KEY");
    if (!DEEPSEEK_API_KEY) throw new Error("DEEPSEEK_API_KEY not configured");

    const promptTokensEstimate = estimateTokens(systemPrompt + userPrompt);
    console.log(`[generate-book] start task=${String(taskType)} project=${projectId || "none"}`);

    const response = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        max_tokens: 8192,
        temperature: 0.8,
        stream: true,
      }),
    });

    if (!response.ok) {
      const t = await response.text();
      console.error("[generate-book] DeepSeek API error:", response.status, t);
      return jsonResponse({ error: publicErrorMessage(response.status) }, response.status === 401 ? 402 : response.status);
    }

    // Read SSE stream from DeepSeek and accumulate full content,
    // while writing keepalive whitespace to the client to prevent idle timeout.
    if (!response.body) return jsonResponse({ error: "AI provider returned an empty stream." }, 502);
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        let accumulated = "";
        let buffer = "";
        let lastFlush = Date.now();
        let closed = false;

        const safeEnqueue = (chunk: Uint8Array): boolean => {
          if (closed) return false;
          try {
            controller.enqueue(chunk);
            return true;
          } catch {
            closed = true;
            return false;
          }
        };

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });

            const lines = buffer.split("\n");
            buffer = lines.pop() || "";

            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed.startsWith("data:")) continue;
              const data = trimmed.slice(5).trim();
              if (data === "[DONE]") continue;
              try {
                const json = JSON.parse(data);
                const delta = json.choices?.[0]?.delta?.content || "";
                if (delta) accumulated += delta;
              } catch {
                // ignore partial JSON
              }
            }

            // Send a keepalive byte every 10s to keep the connection active
            if (Date.now() - lastFlush > 10_000) {
              if (!safeEnqueue(encoder.encode(" "))) break;
              lastFlush = Date.now();
            }
          }

          // Final payload as JSON line at the end
          safeEnqueue(encoder.encode(`\n__RESULT__${JSON.stringify({ content: accumulated })}`));

          // Track usage (estimated — DeepSeek doesn't return usage in stream mode)
          logAIUsage({
            provider: "deepseek",
            model: "deepseek-chat",
            taskType: String(taskType),
            promptTokens: promptTokensEstimate,
            completionTokens: estimateTokens(accumulated),
            projectId: typeof projectId === "string" ? projectId : null,
            userId: typeof userId === "string" ? userId : null,
            metadata: {
              ...(metadata && typeof metadata === "object" && !Array.isArray(metadata) ? metadata : {}),
              stream: true,
              estimated: true,
            },
          });
          console.log(`[generate-book] complete task=${String(taskType)} chars=${accumulated.length}`);

          if (!closed) {
            try { controller.close(); } catch { /* already closed by client abort */ }
          }
        } catch (e) {
          console.error("[generate-book] stream error:", e instanceof Error ? e.message : e);
          try { reader.cancel(); } catch { /* ignore */ }
          if (!closed) {
            try { controller.error(e); } catch { /* already closed */ }
          }
        }
      },
      cancel() {
        // Client disconnected — stop reading from upstream
        try { reader.cancel(); } catch { /* ignore */ }
      },
    });

    return new Response(stream, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (e) {
    console.error("generate-book error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
