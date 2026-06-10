import { isDevMode } from "@/lib/dev-mode";
import { supabase } from "@/integrations/supabase/client";

export type BillingExecutionMode = "server" | "local_dev";

/** Production uses server wallet. Local Vite dev (and Dev Mode) use local wallet for simulated top-up. */
export function getBillingExecutionMode(): BillingExecutionMode {
  if (import.meta.env.PROD) return "server";
  if (import.meta.env.DEV || isDevMode()) return "local_dev";
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
