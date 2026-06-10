import { toast } from "sonner";
import type { CreditOperationId } from "./types";
import { getOperationCost } from "./creditPolicy";
import { OPERATION_DISPLAY_LABELS } from "./walletAnalytics";
import { resolvePaymentProvider } from "./billingProvider";
import { isDevMode } from "./devMode";
import { formatCredits } from "@/lib/credit-economy";
import type { BookLength } from "@/types/book";

export interface InsufficientCreditsDetail {
  operation: CreditOperationId;
  cost: number;
  balance: number;
  operationLabel: string;
}

export function getPurchaseCtaLabel(): string {
  const provider = resolvePaymentProvider();
  if (provider === "dev" && isDevMode()) return "Add Credits Instantly";
  return "Acquista Crediti";
}

export function getOperationLabel(operation: CreditOperationId | string): string {
  return OPERATION_DISPLAY_LABELS[operation] || String(operation);
}

export function formatCreditCostLabel(operation: CreditOperationId, bookLength?: BookLength): string {
  const cost = getOperationCost(operation, bookLength);
  return `Costo: ${formatCredits(cost)} crediti`;
}

export function notifyCreditDebit(cost: number, balanceAfter: number): void {
  if (cost <= 0) return;
  toast.message(`-${formatCredits(cost)} crediti`, {
    description: `Saldo attuale: ${formatCredits(balanceAfter)}`,
    duration: 3500,
  });
}

export function notifyCreditCredit(amount: number, balanceAfter: number): void {
  if (amount <= 0) return;
  toast.success(`+${formatCredits(amount)} crediti`, {
    description: `Saldo attuale: ${formatCredits(balanceAfter)}`,
    duration: 4000,
  });
}

export function dispatchInsufficientCredits(detail: InsufficientCreditsDetail): void {
  window.dispatchEvent(new CustomEvent("scriptora-insufficient-credits", { detail }));
}

export function buildInsufficientCreditsDetail(
  operation: CreditOperationId,
  cost: number,
  balance: number,
): InsufficientCreditsDetail {
  return {
    operation,
    cost,
    balance,
    operationLabel: getOperationLabel(operation),
  };
}
