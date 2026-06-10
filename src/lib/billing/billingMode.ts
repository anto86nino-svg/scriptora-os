import { isDevMode } from "@/lib/dev-mode";
import { isDevUnlimitedCredits } from "./devMode";
import { supabase } from "@/integrations/supabase/client";

export type BillingExecutionMode = "server" | "local_dev";

/** Production always uses server wallet. Local wallet only in dev simulation. */
export function getBillingExecutionMode(): BillingExecutionMode {
  if (import.meta.env.PROD) return "server";
  if (isDevMode() && isDevUnlimitedCredits()) return "local_dev";
  return "server";
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
