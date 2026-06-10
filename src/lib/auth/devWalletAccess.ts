import { isDevMode } from "@/lib/dev-mode";
import { getAuthSessionEmail } from "./sessionContext";
import { isOwnerEmail } from "./owner";

/** Owner logged in + Dev Mode — uses scoped local wallet with real debits (all builds). */
export function isAuthorizedDevWalletUser(): boolean {
  if (!isDevMode()) return false;
  return isOwnerEmail(getAuthSessionEmail());
}

export function canUseDevWalletFeatures(): boolean {
  return isAuthorizedDevWalletUser();
}

/** Simulated credit packs UI — non-prod only; debits still work on prod for owner dev wallet. */
export function canDevSimulateCreditPurchase(): boolean {
  if (import.meta.env.PROD) return false;
  return canUseDevWalletFeatures();
}
