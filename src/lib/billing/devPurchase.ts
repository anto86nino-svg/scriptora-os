import { addCreditsToWallet } from "./wallet";
import { appendLedgerEntry } from "./ledger";
import { getBillingProvider } from "./billingProvider";
import { isDevUnlimitedCredits } from "./devMode";
import { isDevLocalWalletActive } from "./billingMode";
import type { BillingPurchaseResult } from "./types";
import { notifyCreditCredit } from "./creditUx";

export function canDevSimulateCreditPurchase(): boolean {
  return !import.meta.env.PROD && isDevLocalWalletActive();
}

/** DEV-only instant credit purchase — adds to local wallet, debits work like production. */
export async function purchaseCreditsSimulator(amount: number): Promise<BillingPurchaseResult> {
  if (!canDevSimulateCreditPurchase()) {
    return {
      ok: false,
      creditsAdded: 0,
      balanceAfter: 0,
      provider: "dev",
      simulated: false,
      error: "Acquisto simulato disponibile solo in build di sviluppo (npm run dev).",
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
