import { applyVisualEnvironment } from "@/lib/atmosphere-engine";
import { validateAuthorIdentityStorage } from "@/lib/author-identity";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import { ensureStorageHydrated } from "./lib/smart-boot";
import { getSupabaseClient, isSupabaseConfigured } from "./integrations/supabase/client";

// One-time migration: rename legacy "scriptora-*" storage keys to "nexora-*"
(() => {
  try {
    const migrate = (storage: Storage) => {
      const keys: string[] = [];
      for (let i = 0; i < storage.length; i++) {
        const k = storage.key(i);
        if (
          k &&
          k.toLowerCase().startsWith("scriptora") &&
          !k.toLowerCase().includes("appearance")
        ) {
          keys.push(k);
        }
      }
      for (const oldKey of keys) {
        const newKey = oldKey.replace(/^scriptora/i, (m) =>
          m === "SCRIPTORA" ? "NEXORA" : m === "Scriptora" ? "Nexora" : "nexora",
        );
        if (!storage.getItem(newKey)) {
          const v = storage.getItem(oldKey);
          if (v != null) storage.setItem(newKey, v);
        }
        storage.removeItem(oldKey);
      }
    };
    migrate(localStorage);
    migrate(sessionStorage);
  } catch {
    /* ignore */
  }
})();

try {
  applyVisualEnvironment();
  validateAuthorIdentityStorage();
} catch {
  /* ignore appearance boot errors */
}

createRoot(document.getElementById("root")!).render(<App />);

ensureStorageHydrated().catch(() => {});

(async () => {
  if (!isSupabaseConfigured()) return;
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.rpc("auto_fail_stale_runs" as any);
    if (!error && typeof data === "number" && data > 0) {
      console.log(`[recovery] Auto-failed ${data} stale run(s).`);
    }
  } catch {
    /* ignore */
  }
})();
