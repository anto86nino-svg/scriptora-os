import { addCreditsToWallet } from "./wallet";
import { appendLedgerEntry } from "./ledger";
import { getBillingProvider } from "./billingProvider";
import { isDevMode, isDevUnlimitedCredits } from "./devMode";
import { getBillingExecutionMode } from "./billingMode";
import type { BillingPurchaseResult } from "./types";
import { notifyCreditCredit } from "./creditUx";

/** DEV-only instant credit purchase simulator */
export async function purchaseCreditsSimulator(amount: number): Promise<BillingPurchaseResult> {
  if (!isDevMode()) {
    return {
      ok: false,
      creditsAdded: 0,
      balanceAfter: 0,
      provider: "dev",
      simulated: false,
      error: "Purchase simulator available only in Dev Mode.",
    };
  }

  if (getBillingExecutionMode() === "server") {
    return {
      ok: false,
      creditsAdded: 0,
      balanceAfter: 0,
      provider: "dev",
      simulated: false,
      error: "I crediti dev sono solo locali. Attiva DEV Unlimited (simulazione) oppure usa il wallet server.",
    };
  }

  const provider = getBillingProvider();
  const preview = await provider.purchaseCredits(amount, `dev-sim-${amount}`);
  const wallet = addCreditsToWallet(amount);

  appendLedgerEntry({
    operation: "dev_purchase",
    amount,
    balanceAfter: wallet.balance,
    metadata: {
      pack: amount,
      unlimitedMode: isDevUnlimitedCredits(),
      provider: provider.id,
    },
    simulated: true,
  });

  notifyCreditCredit(amount, wallet.balance);

  return {
    ok: true,
    creditsAdded: amount,
    balanceAfter: wallet.balance,
    provider: "dev",
    simulated: true,
  };
}
