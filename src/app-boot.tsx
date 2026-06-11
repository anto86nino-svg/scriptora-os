import { createRoot } from "react-dom/client";
import { recoverFromChunkLoadError } from "@/lib/lazyWithRetry";
import App from "./App.tsx";
import { hydrateFromIndexedDB } from "./lib/storage";
import { supabase } from "./integrations/supabase/client";

if (typeof window !== "undefined") {
  window.addEventListener("unhandledrejection", (event) => {
    if (recoverFromChunkLoadError(event.reason)) {
      event.preventDefault();
    }
  });
}

createRoot(document.getElementById("root")!).render(<App />);

hydrateFromIndexedDB().catch(() => {});

(async () => {
  try {
    const { data, error } = await supabase.rpc("auto_fail_stale_runs" as any);
    if (!error && typeof data === "number" && data > 0) {
      console.log(`[recovery] Auto-failed ${data} stale run(s).`);
    }
  } catch {
    /* ignore */
  }
})();
