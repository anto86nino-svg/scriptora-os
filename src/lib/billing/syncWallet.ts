import { loadCreditWallet, saveCreditWallet } from "./wallet";

/** Align localStorage cache with authoritative server balance after a failed or rejected commit. */
export function syncWalletBalanceFromServer(balanceAfter: number): void {
  const cached = loadCreditWallet();
  saveCreditWallet({
    balance: Math.max(0, balanceAfter),
    planId: cached.planId,
    updatedAt: new Date().toISOString(),
  });
}
