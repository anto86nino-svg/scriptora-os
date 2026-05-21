import { supabase } from "@/integrations/supabase/client";
import type { PlanTier } from "@/lib/plan";
import { normalizePlan } from "@/lib/subscription";
import { getCurrentUserId } from "@/services/storageService";

export type SceneImageStatus = "ready" | "cached" | "disabled" | "limit" | "unconfigured" | "unavailable";

export interface SceneImageInput {
  projectId: string;
  chapterIndex: number;
  chapterTitle: string;
  chapterSummary?: string;
  genre: string;
  subcategory?: string;
  tone?: string;
  language?: string;
  plan: PlanTier;
  sceneLabel: string;
  emotionLabel: string;
  subjectLabel: string;
  cameraLabel: string;
  rhythmLabel: string;
  contentSnippet?: string;
}

export interface SceneImageResult {
  status: SceneImageStatus;
  imageUrl: string | null;
  cacheKey?: string;
  provider?: string;
  model?: string;
  costUsd?: number;
  reason?: string;
}

const LOCAL_CACHE_PREFIX = "scriptora_scene_image_v1:";
const NEGATIVE_CACHE_TTL_MS = 30 * 60 * 1000;

const negativeCache = new Map<string, { status: SceneImageStatus; reason?: string; until: number }>();

function compact(value: string | undefined | null): string {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function hashString(value: string): string {
  let hash = 5381;
  for (let i = 0; i < value.length; i += 1) {
    hash = ((hash << 5) + hash) ^ value.charCodeAt(i);
  }
  return (hash >>> 0).toString(36);
}

export function canUseSceneImages(plan: PlanTier): boolean {
  return normalizePlan(plan) !== "free";
}

export function getSceneImageLocalKey(input: SceneImageInput): string {
  const signature = [
    input.projectId,
    input.chapterIndex,
    input.chapterTitle,
    input.sceneLabel,
    input.emotionLabel,
    input.subjectLabel,
    input.cameraLabel,
    input.rhythmLabel,
    compact(input.contentSnippet).slice(-520),
  ].join("|");
  return `${LOCAL_CACHE_PREFIX}${hashString(signature)}`;
}

function readLocalCache(key: string): SceneImageResult | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SceneImageResult & { savedAt?: number };
    if (!parsed.imageUrl) return null;
    return { ...parsed, status: "cached" };
  } catch {
    return null;
  }
}

function writeLocalCache(key: string, result: SceneImageResult): void {
  if (!result.imageUrl) return;
  try {
    localStorage.setItem(key, JSON.stringify({ ...result, savedAt: Date.now() }));
  } catch {
    // Browser storage can be full or unavailable; Supabase cache still protects costs.
  }
}

export async function requestSceneImage(input: SceneImageInput): Promise<SceneImageResult> {
  if (!canUseSceneImages(input.plan)) {
    return { status: "disabled", imageUrl: null, reason: "paid-plan-required" };
  }

  const localKey = getSceneImageLocalKey(input);
  const cached = readLocalCache(localKey);
  if (cached) return cached;

  const negative = negativeCache.get(localKey);
  if (negative && negative.until > Date.now()) {
    return { status: negative.status, imageUrl: null, reason: negative.reason };
  }

  try {
    const { data, error } = await supabase.functions.invoke("generate-scene-image", {
      body: {
        ...input,
        userId: getCurrentUserId(),
        contentSnippet: compact(input.contentSnippet).slice(-900),
      },
    });

    if (error) throw new Error(error.message || "Scene image generation unavailable");

    const result: SceneImageResult = {
      status: (data?.status || (data?.imageUrl ? "ready" : "unavailable")) as SceneImageStatus,
      imageUrl: data?.imageUrl || null,
      cacheKey: data?.cacheKey,
      provider: data?.provider,
      model: data?.model,
      costUsd: typeof data?.costUsd === "number" ? data.costUsd : undefined,
      reason: data?.reason || data?.error,
    };

    if (result.imageUrl) {
      writeLocalCache(localKey, result);
      return result;
    }

    negativeCache.set(localKey, {
      status: result.status,
      reason: result.reason,
      until: Date.now() + NEGATIVE_CACHE_TTL_MS,
    });
    return result;
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Scene image generation unavailable";
    negativeCache.set(localKey, {
      status: "unavailable",
      reason,
      until: Date.now() + NEGATIVE_CACHE_TTL_MS,
    });
    return { status: "unavailable", imageUrl: null, reason };
  }
}
