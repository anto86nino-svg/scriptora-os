import { isDevMode } from "@/lib/dev-mode";
import { supabase } from "@/integrations/supabase/client";

export type BillingExecutionMode = "server" | "local_dev";

/** Production always uses server wallet. Dev Mode uses local wallet (fake purchase, real debits). */
export function getBillingExecutionMode(): BillingExecutionMode {
  if (import.meta.env.PROD) return "server";
  if (isDevMode()) return "local_dev";
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
