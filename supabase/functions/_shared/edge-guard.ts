/**
 * Centralized Edge Function auth + plan + quota enforcement.
 * Frontend plan flags are never trusted — always resolve from user_plans + ai_usage_logs.
 */
import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

export const STANDARD_CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version, x-scriptora-health-key",
};

export type PlanTier = "free" | "beta" | "pro" | "premium";
export type NormalizedTier = "free" | "pro" | "premium";

export const PLAN_RANK: Record<NormalizedTier, number> = { free: 0, pro: 1, premium: 2 };

const TOKEN_LIMITS: Record<NormalizedTier, number | null> = {
  free: 10_000,
  pro: null,
  premium: null,
};

const BOOKS_PER_MONTH: Record<NormalizedTier, number | null> = {
  free: 1,
  pro: 10,
  premium: null,
};

export interface EdgeGuardOptions {
  minTier?: NormalizedTier;
  ownerOnly?: boolean;
  checkProjectTokens?: boolean;
  checkBooksPerMonth?: boolean;
  projectIdKeys?: string[];
}

export interface EdgeAuthContext {
  userId: string;
  email: string | undefined;
  plan: PlanTier;
  normalizedPlan: NormalizedTier;
  admin: SupabaseClient | null;
  isOwner: boolean;
}

export function normalizePlan(plan: string | null | undefined): NormalizedTier {
  if (plan === "premium") return "premium";
  if (plan === "pro" || plan === "beta") return "pro";
  return "free";
}

export function tierAtLeast(actual: NormalizedTier, min: NormalizedTier): boolean {
  return PLAN_RANK[actual] >= PLAN_RANK[min];
}

function json(body: Record<string, unknown>, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...STANDARD_CORS, "Content-Type": "application/json" },
  });
}

export function guardError(
  code: string,
  message: string,
  status: number,
  extra: Record<string, unknown> = {},
) {
  return json({ ok: false, error: message, code, ...extra }, status);
}

function getOwnerEmails(): Set<string> {
  const raw = Deno.env.get("SCRIPTORA_OWNER_EMAILS") || "natasharomanoff1990anto@gmail.com";
  return new Set(raw.split(",").map((e) => e.trim().toLowerCase()).filter(Boolean));
}

export function getAdminClient(): SupabaseClient | null {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

function pickProjectId(body: Record<string, unknown>, keys: string[]): string | null {
  for (const k of keys) {
    const v = body[k];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return null;
}

async function resolveUserFromJwt(req: Request): Promise<{ userId: string; email?: string } | Response> {
  const authHeader = req.headers.get("Authorization") || req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return guardError("UNAUTHORIZED", "Missing authorization token", 401);
  }

  const url = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!url || !anonKey) {
    return guardError("SERVER_MISCONFIGURED", "Auth not configured", 500);
  }

  const token = authHeader.slice(7).trim();
  const authClient = createClient(url, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await authClient.auth.getUser(token);
  if (error || !data?.user?.id) {
    return guardError("UNAUTHORIZED", "Invalid or expired session", 401);
  }

  return { userId: data.user.id, email: data.user.email };
}

async function fetchUserPlan(admin: SupabaseClient | null, userId: string): Promise<PlanTier> {
  if (!admin) return "free";
  try {
    const { data } = await admin.from("user_plans").select("plan").eq("user_id", userId).maybeSingle();
    const plan = String((data as { plan?: string } | null)?.plan || "free") as PlanTier;
    if (plan === "beta" || plan === "pro" || plan === "premium") return plan;
    return "free";
  } catch {
    return "free";
  }
}

async function getProjectTokens(admin: SupabaseClient, projectId: string): Promise<number> {
  const { data } = await admin.from("ai_usage_logs").select("total_tokens").eq("project_id", projectId);
  return ((data as { total_tokens: number }[] | null) || []).reduce(
    (s, r) => s + (Number(r.total_tokens) || 0),
    0,
  );
}

async function getBooksThisMonth(admin: SupabaseClient, userId: string): Promise<number> {
  const start = new Date();
  start.setUTCDate(1);
  start.setUTCHours(0, 0, 0, 0);
  try {
    const { count } = await admin
      .from("projects")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("created_at", start.toISOString());
    return count || 0;
  } catch {
    return 0;
  }
}

/** Internal health/smoke ping — service role + health_ping task only. */
function tryHealthBypass(req: Request, body: Record<string, unknown>): EdgeAuthContext | null {
  if (body.taskType !== "health_ping") return null;

  const healthKey = Deno.env.get("SCRIPTORA_HEALTH_KEY");
  const headerKey = req.headers.get("x-scriptora-health-key");
  if (healthKey && headerKey === healthKey) {
    return {
      userId: "health-ping",
      email: undefined,
      plan: "premium",
      normalizedPlan: "premium",
      admin: getAdminClient(),
      isOwner: true,
    };
  }

  const authHeader = req.headers.get("Authorization") || "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  if (serviceKey && authHeader === `Bearer ${serviceKey}`) {
    return {
      userId: "health-ping",
      email: undefined,
      plan: "premium",
      normalizedPlan: "premium",
      admin: getAdminClient(),
      isOwner: true,
    };
  }

  return null;
}

export async function enforceEdgeGuard(
  req: Request,
  body: Record<string, unknown>,
  options: EdgeGuardOptions = {},
): Promise<EdgeAuthContext | Response> {
  if (Deno.env.get("EDGE_GUARD_DISABLED") === "1") {
    const admin = getAdminClient();
    const userId = typeof body.userId === "string" && body.userId.trim()
      ? body.userId.trim()
      : "local-dev";
    return {
      userId,
      email: undefined,
      plan: "premium",
      normalizedPlan: "premium",
      admin,
      isOwner: true,
    };
  }

  const healthCtx = tryHealthBypass(req, body);
  if (healthCtx) return healthCtx;

  const {
    minTier = "free",
    ownerOnly = false,
    checkProjectTokens = false,
    checkBooksPerMonth = false,
    projectIdKeys = ["projectId", "project_id"],
  } = options;

  const resolved = await resolveUserFromJwt(req);
  if (resolved instanceof Response) return resolved;

  const { userId, email } = resolved;
  const bodyUserId = typeof body.userId === "string" ? body.userId.trim() : "";
  if (bodyUserId && bodyUserId !== userId && !bodyUserId.startsWith("local-")) {
    return guardError("FORBIDDEN", "userId mismatch", 403);
  }

  const owners = getOwnerEmails();
  const isOwner = !!email && owners.has(email.toLowerCase());

  if (ownerOnly && !isOwner) {
    return guardError("FORBIDDEN", "Owner access required", 403);
  }

  const admin = getAdminClient();
  let plan = await fetchUserPlan(admin, userId);
  if (isOwner) plan = "premium";
  const normalizedPlan = isOwner ? "premium" : normalizePlan(plan);

  if (!tierAtLeast(normalizedPlan, minTier)) {
    return guardError("PLAN_REQUIRED", `Requires ${minTier} plan or higher`, 403, {
      required: minTier,
      actual: normalizedPlan,
    });
  }

  if (checkProjectTokens && admin) {
    const projectId = pickProjectId(body, projectIdKeys);
    if (projectId) {
      const limit = TOKEN_LIMITS[normalizedPlan];
      if (limit != null) {
        const used = await getProjectTokens(admin, projectId);
        if (used >= limit) {
          return guardError("TOKEN_LIMIT", "Project token quota exceeded", 429, { used, limit });
        }
      }
    }
  }

  if (checkBooksPerMonth && admin) {
    const limit = BOOKS_PER_MONTH[normalizedPlan];
    if (limit != null) {
      const count = await getBooksThisMonth(admin, userId);
      if (count >= limit) {
        return guardError("BOOK_LIMIT", "Monthly book limit reached", 429, { count, limit });
      }
    }
  }

  return { userId, email, plan, normalizedPlan, admin, isOwner };
}

export function applyAuthContext<T extends Record<string, unknown>>(
  ctx: EdgeAuthContext,
  body: T,
): T & { userId: string; plan: PlanTier } {
  return { ...body, userId: ctx.userId, plan: ctx.plan };
}

/** Edge guard profiles — single map for audit documentation. */
export const EDGE_GUARD_PROFILES: Record<string, EdgeGuardOptions> = {
  "generate-book": { minTier: "free", checkProjectTokens: true },
  "fix-section": { minTier: "free", checkProjectTokens: true },
  "generate-blueprint-fast": { minTier: "free", checkProjectTokens: true },
  "detect-book-intent": { minTier: "free" },
  "title-autofill": { minTier: "free" },
  "analyze-chapter": { minTier: "pro", checkProjectTokens: true },
  "patch-chapter": { minTier: "pro", checkProjectTokens: true },
  "dominate-chapter": { minTier: "premium", checkProjectTokens: true },
  "auto-bestseller-engine": { minTier: "premium", checkBooksPerMonth: true },
  "generate-scene-image": { minTier: "pro" },
  "scriptora-character-bible": { minTier: "free", checkProjectTokens: true },
  "kdp-money-engine": { minTier: "pro" },
  "bestseller-radar": { minTier: "pro" },
  "market-validator": { minTier: "pro" },
  "title-intelligence": { minTier: "pro" },
  "go-no-go-engine": { minTier: "premium" },
  "genre-coach": { minTier: "free", checkProjectTokens: true },
  "live-coach": { minTier: "pro", checkProjectTokens: true },
  "molly-chat": { minTier: "free", checkProjectTokens: true },
  "expand-author-bio": { minTier: "free" },
  "publish-tools": { minTier: "pro" },
  "scriptora-novel-idea": { minTier: "free", checkProjectTokens: true },
  "activate-beta": { minTier: "free" },
  "exit-editorial-preview": { minTier: "free" },
  "get-credit-wallet": { minTier: "free" },
  "reserve-credits": { minTier: "free" },
  "commit-credit-usage": { minTier: "free" },
  "refund-credit-usage": { minTier: "free" },
  "create-stripe-checkout-session": { minTier: "free" },
  "ai-usage-summary": { ownerOnly: true },
};
