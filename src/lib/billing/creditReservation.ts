/**
 * Server-side credit reserve / commit / refund utilities (Sprint A2).
 * Not wired into AI flows yet — call explicitly once tested.
 */
import { isSupabaseConfigured } from "@/integrations/supabase/client";
import { invokeSupabaseFunction } from "@/lib/supabase-function-auth";
import {
  calculateCreditCost,
  type CreditCostParams,
  type CreditOperation,
} from "@/lib/billing/creditPolicy";

export interface CreditReservationResult {
  ok: boolean;
  allowed?: boolean;
  ledgerId?: string;
  balance?: number;
  reserved?: number;
  required?: number;
  idempotent?: boolean;
  error?: string;
}

export interface PrepareCreditReservationInput {
  operation: CreditOperation;
  costParams?: Omit<CreditCostParams, "operation">;
  provider?: string;
  referenceId?: string;
  metadata?: Record<string, unknown>;
}

/** Reserve credits on the server ledger. Returns null when backend is not configured. */
export async function prepareCreditReservation(
  input: PrepareCreditReservationInput,
): Promise<CreditReservationResult | null> {
  if (!isSupabaseConfigured()) return null;

  const requiredCredits = calculateCreditCost({
    operation: input.operation,
    ...input.costParams,
  });

  const { data, error } = await invokeSupabaseFunction<CreditReservationResult>(
    "reserve-credits",
    {
      body: {
        operation: input.operation,
        requiredCredits,
        provider: input.provider ?? input.costParams?.provider ?? null,
        referenceId: input.referenceId ?? null,
        metadata: input.metadata ?? {},
      },
    },
  );

  if (error) return { ok: false, error: error.message };
  return data ?? { ok: false, error: "Empty reserve response" };
}

/** Mark a pending reservation as committed (idempotent). */
export async function commitCreditReservation(
  ledgerId: string,
): Promise<CreditReservationResult | null> {
  if (!isSupabaseConfigured() || !ledgerId.trim()) return null;

  const { data, error } = await invokeSupabaseFunction<CreditReservationResult>(
    "commit-credit-usage",
    { body: { ledgerId } },
  );

  if (error) return { ok: false, error: error.message };
  return data ?? { ok: false, error: "Empty commit response" };
}

/** Refund credits after a failed AI operation (idempotent). */
export async function refundCreditReservation(
  ledgerId: string,
): Promise<CreditReservationResult | null> {
  if (!isSupabaseConfigured() || !ledgerId.trim()) return null;

  const { data, error } = await invokeSupabaseFunction<CreditReservationResult>(
    "refund-credit-usage",
    { body: { ledgerId } },
  );

  if (error) return { ok: false, error: error.message };
  return data ?? { ok: false, error: "Empty refund response" };
}
