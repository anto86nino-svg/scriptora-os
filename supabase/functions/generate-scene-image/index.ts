import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { applyAuthContext, enforceEdgeGuard, EDGE_GUARD_PROFILES } from "../_shared/edge-guard.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type PlanTier = "free" | "beta" | "pro" | "premium";

type SceneImageBody = {
  userId?: string | null;
  projectId?: string | null;
  chapterIndex?: number;
  chapterTitle?: string;
  chapterSummary?: string;
  genre?: string;
  subcategory?: string;
  tone?: string;
  language?: string;
  plan?: PlanTier;
  sceneLabel?: string;
  emotionLabel?: string;
  subjectLabel?: string;
  cameraLabel?: string;
  rhythmLabel?: string;
  contentSnippet?: string;
  force?: boolean;
};

type SupabaseAdminClient = SupabaseClient<any, "public", any>;

const MODEL = Deno.env.get("SCENE_IMAGE_MODEL") || "fal-ai/flux/schnell";
const IMAGE_SIZE = Deno.env.get("SCENE_IMAGE_SIZE") || "landscape_16_9";
const COST_PER_IMAGE_USD = Number(Deno.env.get("SCENE_IMAGE_COST_USD") || "0.003");

function json(payload: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function compact(value: unknown, max = 1200): string {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, max);
}

async function sha256(value: string): Promise<string> {
  const data = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("").slice(0, 32);
}

function getSupabaseAdmin(): SupabaseAdminClient | null {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

function buildPrompt(body: SceneImageBody): string {
  const genre = compact([body.genre, body.subcategory].filter(Boolean).join(" / "), 90) || "contemporary fiction";
  const tone = compact(body.tone, 80) || "cinematic";
  const chapter = compact(body.chapterTitle, 140);
  const summary = compact(body.chapterSummary, 360);
  const scene = compact(body.sceneLabel, 90) || "intimate cinematic scene";
  const emotion = compact(body.emotionLabel, 80) || "emotional tension";
  const camera = compact(body.cameraLabel, 80) || "natural handheld camera";
  const rhythm = compact(body.rhythmLabel, 80) || "quiet dramatic rhythm";
  const subject = compact(body.subjectLabel, 120);
  const snippet = compact(body.contentSnippet, 700);
  const subjectLine = subject && !/^capitolo\s+\d+/i.test(subject)
    ? `Main subjects: ${subject}, realistic adults, coherent wardrobe and body language.`
    : "Main subjects: realistic adult characters, natural body language, no mannequin look.";

  return [
    "Ultra-realistic cinematic still photograph from a premium streaming drama, not an illustration.",
    `Book genre: ${genre}. Writing tone: ${tone}.`,
    chapter ? `Chapter: ${chapter}.` : "",
    summary ? `Chapter context: ${summary}.` : "",
    `Scene to depict: ${scene}. Emotional core: ${emotion}. Rhythm: ${rhythm}.`,
    subjectLine,
    snippet ? `Current paragraph context, interpreted visually only: ${snippet}` : "",
    `Camera and lighting: ${camera}, 35mm film still, natural available light, shallow depth of field, tactile realistic textures, imperfect human skin, authentic facial expression, subtle film grain, cinematic color grading, believable location.`,
    "No text, no captions, no book cover, no watermark, no logos, no UI, no 3D render, no CGI, no doll-like faces, no plastic skin, no painting, no cartoon, no abstract composition.",
  ].filter(Boolean).join("\n");
}

async function readCachedImage(
  supabase: SupabaseAdminClient | null,
  userId: string,
  projectId: string,
  chapterIndex: number,
  sceneHash: string,
) {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from("scene_image_cache")
      .select("image_url,provider,model,cost_usd,scene_hash")
      .eq("user_id", userId)
      .eq("project_id", projectId)
      .eq("chapter_index", chapterIndex)
      .eq("scene_hash", sceneHash)
      .maybeSingle();
    if (error) return null;
    return data;
  } catch {
    return null;
  }
}

async function countMonthlyImages(supabase: SupabaseAdminClient | null, userId: string): Promise<number | null> {
  if (!supabase) return null;
  const start = new Date();
  start.setUTCDate(1);
  start.setUTCHours(0, 0, 0, 0);
  try {
    const { count, error } = await supabase
      .from("scene_image_cache")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("created_at", start.toISOString());
    if (error) return null;
    return count || 0;
  } catch {
    return null;
  }
}

async function storeImage(params: {
  supabase: SupabaseAdminClient | null;
  body: SceneImageBody;
  userId: string;
  projectId: string;
  chapterIndex: number;
  sceneHash: string;
  prompt: string;
  imageUrl: string;
  plan: string;
  falResult: Record<string, unknown>;
}) {
  const { supabase, body, userId, projectId, chapterIndex, sceneHash, prompt, imageUrl, plan, falResult } = params;
  if (!supabase) return;
  const metadata = {
    image_size: IMAGE_SIZE,
    sceneLabel: body.sceneLabel || null,
    emotionLabel: body.emotionLabel || null,
    cameraLabel: body.cameraLabel || null,
    rhythmLabel: body.rhythmLabel || null,
    falSeed: (falResult as any)?.seed ?? null,
    pricing_source: "fal.ai FLUX Schnell",
    pricing_checked_at: "2026-05-20",
  };

  try {
    await supabase.from("scene_image_cache").upsert({
      user_id: userId,
      project_id: projectId,
      chapter_index: chapterIndex,
      scene_hash: sceneHash,
      plan,
      provider: "fal",
      model: MODEL,
      image_url: imageUrl,
      prompt,
      cost_usd: COST_PER_IMAGE_USD,
      status: "ready",
      metadata,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id,project_id,chapter_index,scene_hash" });
  } catch (error) {
    console.error("[generate-scene-image] cache insert failed", error instanceof Error ? error.message : error);
  }

  try {
    await supabase.from("ai_usage_logs").insert({
      user_id: userId,
      project_id: projectId,
      provider: "fal",
      model: MODEL,
      task_type: "scene_image_generation",
      prompt_tokens: 0,
      completion_tokens: 0,
      total_tokens: 0,
      input_cost: 0,
      output_cost: COST_PER_IMAGE_USD,
      total_cost: COST_PER_IMAGE_USD,
      metadata: { ...metadata, scene_hash: sceneHash },
    });
  } catch (error) {
    console.error("[generate-scene-image] usage log failed", error instanceof Error ? error.message : error);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const rawBody = await req.json().catch(() => ({})) as Record<string, unknown>;
    const guard = await enforceEdgeGuard(req, rawBody, EDGE_GUARD_PROFILES["generate-scene-image"]);
    if (guard instanceof Response) return guard;
    const body = applyAuthContext(guard, rawBody) as SceneImageBody;
    const plan = guard.normalizedPlan;
    if (plan === "free") {
      return json({ ok: false, status: "disabled", imageUrl: null, reason: "paid-plan-required" });
    }

    const falKey = Deno.env.get("FAL_KEY");
    if (!falKey) {
      return json({ ok: false, status: "unconfigured", imageUrl: null, reason: "missing-fal-key" });
    }

    const userId = guard.userId;
    const projectId = compact(body.projectId, 120);
    const chapterIndex = Number.isFinite(Number(body.chapterIndex)) ? Number(body.chapterIndex) : 0;
    if (!projectId) return json({ ok: false, status: "unavailable", imageUrl: null, reason: "missing-project-id" });

    const prompt = buildPrompt(body);
    const sceneHash = await sha256([
      projectId,
      chapterIndex,
      body.chapterTitle,
      body.sceneLabel,
      body.emotionLabel,
      body.subjectLabel,
      body.cameraLabel,
      body.rhythmLabel,
      compact(body.contentSnippet, 700),
    ].join("|"));
    const supabase = getSupabaseAdmin();

    if (!body.force) {
      const cached = await readCachedImage(supabase, userId, projectId, chapterIndex, sceneHash);
      if (cached?.image_url) {
        return json({
          ok: true,
          status: "cached",
          imageUrl: cached.image_url,
          provider: cached.provider || "fal",
          model: cached.model || MODEL,
          costUsd: Number(cached.cost_usd || 0),
          cacheKey: sceneHash,
        });
      }
    }

    const monthlyLimit = plan === "premium" ? 1200 : 300;
    const monthlyCount = await countMonthlyImages(supabase, userId);
    if (typeof monthlyCount === "number" && monthlyCount >= monthlyLimit) {
      return json({ ok: false, status: "limit", imageUrl: null, reason: "monthly-scene-image-limit", limit: monthlyLimit });
    }

    const falResponse = await fetch(`https://fal.run/${MODEL}`, {
      method: "POST",
      headers: {
        Authorization: `Key ${falKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt,
        image_size: IMAGE_SIZE,
        num_inference_steps: 4,
        guidance_scale: 3.5,
        sync_mode: false,
        num_images: 1,
        enable_safety_checker: true,
        output_format: "jpeg",
        acceleration: "regular",
      }),
    });

    const falText = await falResponse.text();
    if (!falResponse.ok) {
      console.error("[generate-scene-image] fal error", falResponse.status, falText.slice(0, 500));
      return json({ ok: false, status: "unavailable", imageUrl: null, reason: `fal-${falResponse.status}` }, 502);
    }

    const falResult = JSON.parse(falText || "{}");
    const imageUrl = falResult?.images?.[0]?.url;
    if (!imageUrl) {
      return json({ ok: false, status: "unavailable", imageUrl: null, reason: "missing-image-url" });
    }

    await storeImage({
      supabase,
      body,
      userId,
      projectId,
      chapterIndex,
      sceneHash,
      prompt,
      imageUrl,
      plan,
      falResult,
    });

    return json({
      ok: true,
      status: "ready",
      imageUrl,
      provider: "fal",
      model: MODEL,
      costUsd: COST_PER_IMAGE_USD,
      cacheKey: sceneHash,
    });
  } catch (error) {
    console.error("[generate-scene-image]", error);
    return json({
      ok: false,
      status: "unavailable",
      imageUrl: null,
      reason: error instanceof Error ? error.message : "unknown-error",
    }, 500);
  }
});
