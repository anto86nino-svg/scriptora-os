import { isDevMode } from "@/lib/dev-mode";
import { getAuthSessionEmail } from "./sessionContext";
import { isOwnerEmail } from "./owner";

/** Owner logged in + Dev Mode + non-prod build. */
export function isAuthorizedDevWalletUser(): boolean {
  if (import.meta.env.PROD) return false;
  if (!isDevMode()) return false;
  return isOwnerEmail(getAuthSessionEmail());
}

export function canUseDevWalletFeatures(): boolean {
  return isAuthorizedDevWalletUser();
}

export function canDevSimulateCreditPurchase(): boolean {
  return canUseDevWalletFeatures();
}
