import { isAuthorizedDevWalletUser } from "@/lib/auth/devWalletAccess";
import { supabase } from "@/integrations/supabase/client";

export type BillingExecutionMode = "server" | "local_dev";

/** Production uses server wallet. Owner Dev Mode uses scoped local wallet (simulated purchase, real debits). */
export function getBillingExecutionMode(): BillingExecutionMode {
  if (import.meta.env.PROD) return "server";
  if (isAuthorizedDevWalletUser()) return "local_dev";
  return "server";
}

export function isDevLocalWalletActive(): boolean {
  return getBillingExecutionMode() === "local_dev";
}

export async function hasAuthenticatedServerUser(): Promise<boolean> {
  try {
    const { data } = await supabase.auth.getSession();
    const uid = data.session?.user?.id;
    return Boolean(uid && !uid.startsWith("local-user"));
  } catch {
    return false;
  }
}
