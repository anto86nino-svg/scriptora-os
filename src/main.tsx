import { applyScriptoraAppearance } from "@/lib/scriptora-appearance";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { ensureStorageHydrated } from "./lib/smart-boot";
import { supabase } from "./integrations/supabase/client";



// Env sanity check — mostra errore visibile invece di pagina bianca
// se le variabili VITE_SUPABASE_* sono mancanti (es. .env vuoto dopo export).
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY;
if (!SUPABASE_URL || !SUPABASE_KEY) {
  const root = document.getElementById("root");
  if (root) {
    root.innerHTML = `
      <div style="min-height:100vh;display:grid;place-items:center;background:#0a0a1a;color:#fff;font-family:system-ui;padding:24px">
        <div style="max-width:560px">
          <h1 style="font-size:24px;margin:0 0 12px">Configurazione mancante</h1>
          <p style="opacity:.8;line-height:1.5;margin:0 0 16px">
            Scriptora non trova le variabili Supabase nel file <code>.env</code>.
            Crea (o ripristina) un file <code>.env</code> nella root del progetto con:
          </p>
          <pre style="background:#141432;padding:16px;border-radius:8px;overflow:auto;font-size:13px;line-height:1.6">VITE_SUPABASE_URL=https://&lt;project&gt;.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=&lt;anon-or-publishable-key&gt;
VITE_SUPABASE_PROJECT_ID=&lt;project-ref&gt;</pre>
          <p style="opacity:.6;font-size:13px;margin-top:16px">
            Vedi <code>README_EXPORT.md</code> per la guida completa.
          </p>
        </div>
      </div>`;
  }
  throw new Error("Missing Supabase env vars: VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY");
}

// One-time migration: rename legacy "scriptora-*" storage keys to "nexora-*"
// so existing users don't lose their projects after the rebrand.
// Synchronous + cheap (only iterates a handful of keys) — safe to keep before render.
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
        ) keys.push(k);
      }
      for (const oldKey of keys) {
        const newKey = oldKey.replace(/^scriptora/i, (m) =>
          m === "SCRIPTORA" ? "NEXORA" : m === "Scriptora" ? "Nexora" : "nexora"
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

// Apply saved visual settings before first paint.
try {
  applyScriptoraAppearance();
} catch {
  /* ignore appearance boot errors */
}

// Render IMMEDIATELY — do not block first paint on IndexedDB or network.
// Hydration runs in the background; pages refetch when ready.
createRoot(document.getElementById("root")!).render(<App />);

// Background hydration (non-blocking).
ensureStorageHydrated().catch(() => {});

// Recovery: mark stale "running" generations as failed (best-effort, non-blocking).
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

