import { toast } from "sonner";
import type { CreditOperationId } from "./types";
import { getOperationCost } from "./creditPolicy";
import { OPERATION_DISPLAY_LABELS } from "./walletAnalytics";
import { resolvePaymentProvider } from "./billingProvider";
import { isDevMode } from "./devMode";
import { formatCredits } from "@/lib/credit-economy";
import type { BookLength } from "@/types/book";
import { getCreditValuePresentation } from "./creditPsychology";

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
  const { shortLabel } = getCreditValuePresentation(operation, bookLength);
  return shortLabel;
}

export function formatCreditCostDetail(operation: CreditOperationId, bookLength?: BookLength): string {
  const { premiumLabel, valueHint } = getCreditValuePresentation(operation, bookLength);
  const cost = getOperationCost(operation, bookLength);
  return `${premiumLabel} · ${formatCredits(cost)} crediti · ${valueHint}`;
}

export function notifyCreditDebit(cost: number, balanceAfter: number, operationLabel?: string): void {
  if (cost <= 0) return;
  const headline = operationLabel ? `✨ ${operationLabel}` : "✨ Azione completata";
  toast.message(headline, {
    description: `−${formatCredits(cost)} crediti · Rimangono: ${formatCredits(balanceAfter)} crediti`,
    duration: 4000,
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
