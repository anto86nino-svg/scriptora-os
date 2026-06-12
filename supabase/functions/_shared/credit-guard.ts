import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { getOperationCost } from "./credit-policy.ts";

export interface CreditGuardResult {
  ok: boolean;
  userId: string | null;
  cost: number;
  balanceAfter?: number;
  error?: string;
  status?: number;
}

function getBearerToken(req: Request): string | null {
  const auth = req.headers.get("Authorization") || req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return null;
  return auth.slice(7).trim();
}

export async function requireAuthenticatedUser(req: Request): Promise<{ userId: string } | CreditGuardResult> {
  const token = getBearerToken(req);
  if (!token) {
    return { ok: false, userId: null, cost: 0, error: "Missing authorization", status: 401 };
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) {
    return { ok: false, userId: null, cost: 0, error: "Server misconfigured", status: 500 };
  }

  const admin = createClient(supabaseUrl, serviceKey);
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data?.user?.id) {
    return { ok: false, userId: null, cost: 0, error: "Invalid session", status: 401 };
  }

  return { userId: data.user.id };
}

function parseOwnerEmails(): string[] {
  const raw = Deno.env.get("SCRIPTORA_OWNER_EMAILS")
    || "natasharomanoff1990anto@gmail.com";
  return raw.split(",").map((email) => email.trim().toLowerCase()).filter(Boolean);
}

async function isOwnerUserId(userId: string): Promise<boolean> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) return false;

  const admin = createClient(supabaseUrl, serviceKey);
  const { data, error } = await admin.auth.admin.getUserById(userId);
  if (error || !data?.user?.email) return false;
  return parseOwnerEmails().includes(data.user.email.trim().toLowerCase());
}

async function isCreditSimulationAllowed(req: Request, bodySim?: boolean, userId?: string): Promise<boolean> {
  const header = req.headers.get("x-scriptora-credit-simulation") === "true";
  const flagged = header || bodySim === true;
  if (!flagged) return false;

  const envAllowed = Deno.env.get("SCRIPTORA_ALLOW_CREDIT_SIMULATION") === "1"
    || Deno.env.get("ENVIRONMENT") === "development";
  if (envAllowed) return true;

  if (userId) {
    return isOwnerUserId(userId);
  }
  return false;
}

export async function commitCreditsForUser(input: {
  userId: string;
  userJwt: string;
  operation: string;
  cost?: number;
  metadata?: Record<string, unknown>;
  idempotencyKey?: string | null;
  simulated?: boolean;
}): Promise<CreditGuardResult> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY");
  if (!supabaseUrl || !anonKey) {
    return { ok: false, userId: input.userId, cost: 0, error: "Server misconfigured", status: 500 };
  }

  const cost = input.cost ?? getOperationCost(input.operation);
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${input.userJwt}` } },
  });

  const { data, error } = await userClient.rpc("commit_credit_operation", {
    p_operation: input.operation,
    p_cost: cost,
    p_metadata: input.metadata || {},
    p_idempotency_key: input.idempotencyKey || null,
    p_simulated: Boolean(input.simulated),
  });

  if (error) {
    return { ok: false, userId: input.userId, cost, error: error.message, status: 500 };
  }

  if (!data?.ok) {
    return {
      ok: false,
      userId: input.userId,
      cost,
      balanceAfter: data?.balance_after,
      error: data?.error || "insufficient_credits",
      status: 402,
    };
  }

  return {
    ok: true,
    userId: input.userId,
    cost: data.cost ?? cost,
    balanceAfter: data.balance_after,
  };
}

export async function guardCreditOperation(
  req: Request,
  operation: string,
  opts?: {
    cost?: number;
    metadata?: Record<string, unknown>;
    idempotencyKey?: string | null;
    bodySimulated?: boolean;
  },
): Promise<CreditGuardResult> {
  const token = getBearerToken(req);
  if (!token) {
    return { ok: false, userId: null, cost: 0, error: "Missing authorization", status: 401 };
  }

  const auth = await requireAuthenticatedUser(req);
  if ("ok" in auth && auth.ok === false) return auth;
  if (!("userId" in auth) || !auth.userId) {
    return { ok: false, userId: null, cost: 0, error: "Invalid session", status: 401 };
  }
  const userId = auth.userId;

  const simulated = await isCreditSimulationAllowed(req, opts?.bodySimulated, userId);

  return commitCreditsForUser({
    userId,
    userJwt: token,
    operation,
    cost: opts?.cost,
    metadata: opts?.metadata,
    idempotencyKey: opts?.idempotencyKey,
    simulated,
  });
}
