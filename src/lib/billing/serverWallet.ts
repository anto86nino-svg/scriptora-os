import { supabase } from "@/integrations/supabase/client";
import type { CreditOperationId, CreditWallet } from "./types";
import { getOperationCost } from "./creditPolicy";
import { loadCreditWallet, saveCreditWallet } from "./wallet";
import { appendLedgerEntry } from "./ledger";
import type { BookLength } from "@/types/book";
import { getBillingExecutionMode } from "./billingMode";

export interface ServerCreditCommitResult {
  ok: boolean;
  committed: boolean;
  cost: number;
  balanceAfter: number;
  simulated: boolean;
  error?: string;
  idempotent?: boolean;
}

export async function fetchServerWalletState(): Promise<CreditWallet | null> {
  const { data, error } = await supabase.rpc("get_credit_wallet_state" as never);
  if (error || !data || !(data as { ok?: boolean }).ok) return null;
  const payload = data as { balance: number; plan_id: string; updated_at: string };
  const wallet: CreditWallet = {
    balance: Number(payload.balance) || 0,
    planId: (payload.plan_id as CreditWallet["planId"]) || "free",
    updatedAt: payload.updated_at || new Date().toISOString(),
  };
  saveCreditWallet(wallet);
  return wallet;
}

export async function commitServerCreditOperation(
  operation: CreditOperationId,
  metadata?: Record<string, unknown>,
  bookLength?: BookLength,
  idempotencyKey?: string,
): Promise<ServerCreditCommitResult> {
  const cost = getOperationCost(operation, bookLength);
  const { data, error } = await supabase.rpc("commit_credit_operation" as never, {
    p_operation: operation,
    p_cost: cost,
    p_metadata: metadata || {},
    p_idempotency_key: idempotencyKey || null,
    p_simulated: getBillingExecutionMode() === "local_dev",
  } as never);

  if (error) {
    return {
      ok: false,
      committed: false,
      cost,
      balanceAfter: 0,
      simulated: false,
      error: error.message,
    };
  }

  const result = data as {
    ok?: boolean;
    committed?: boolean;
    cost?: number;
    balance_after?: number;
    simulated?: boolean;
    error?: string;
    idempotent?: boolean;
  };

  if (!result?.ok) {
    return {
      ok: false,
      committed: false,
      cost: result?.cost ?? cost,
      balanceAfter: result?.balance_after ?? 0,
      simulated: false,
      error: result?.error || "insufficient_credits",
    };
  }

  const balanceAfter = Number(result.balance_after) || 0;
  const cached = loadCreditWallet();
  saveCreditWallet({
    balance: balanceAfter,
    planId: cached.planId || "free",
    updatedAt: new Date().toISOString(),
  });

  if (!result.idempotent) {
    appendLedgerEntry({
      operation,
      amount: -(result.cost ?? cost),
      balanceAfter,
      metadata: { ...metadata, server: true },
      simulated: Boolean(result.simulated),
    });
  }

  window.dispatchEvent(new Event("scriptora-credits-change"));
  return {
    ok: true,
    committed: true,
    cost: result.cost ?? cost,
    balanceAfter,
    simulated: Boolean(result.simulated),
    idempotent: Boolean(result.idempotent),
  };
}
