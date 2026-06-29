import { applyScriptoraAppearance } from "@/lib/scriptora-appearance";
import { applyVisualPreset } from "@/lib/performance-mode";
import { applyMobilePerformanceBoot } from "@/lib/mobile-performance";
import { applyAdaptiveViewportBoot } from "@/lib/adaptive-viewport-engine";
import { applyHubPreferences } from "@/lib/settings-store";
import { purgeImmersiveThemeExperiment } from "@/lib/theme-reset";
import "./index.css";
import { migrateLegacyStorageKeys } from "./lib/storage-key-migration";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

function showConfigError(): void {
  const root = document.getElementById("root");
  if (!root) return;
  root.innerHTML = `
    <div style="min-height:100vh;display:grid;place-items:center;background:#0a0a1a;color:#fff;font-family:system-ui;padding:24px">
      <div style="max-width:560px">
        <h1 style="font-size:24px;margin:0 0 12px">Configurazione mancante</h1>
        <p style="opacity:.8;line-height:1.5;margin:0 0 16px">
          Scriptora non trova le variabili Supabase. Crea un file <code style="background:#141432;padding:2px 6px;border-radius:4px">.env</code>
          nella root del progetto, poi riavvia con <code style="background:#141432;padding:2px 6px;border-radius:4px">npm run dev</code>
          (porta <strong>8081</strong>).
        </p>
        <pre style="background:#141432;padding:16px;border-radius:8px;overflow:auto;font-size:13px;line-height:1.6">VITE_SUPABASE_URL=https://&lt;project&gt;.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=&lt;anon-or-publishable-key&gt;
VITE_SUPABASE_PROJECT_ID=&lt;project-ref&gt;</pre>
        <p style="opacity:.6;font-size:13px;margin-top:16px">
          Per deploy: imposta le stesse variabili nella piattaforma di hosting prima di <code>npm run build</code>.
        </p>
      </div>
    </div>`;
}

function showBootError(message: string): void {
  const root = document.getElementById("root");
  if (!root || root.childElementCount > 0) return;
  root.innerHTML = `
    <div style="min-height:100vh;display:grid;place-items:center;background:#0a0a1a;color:#fff;font-family:system-ui;padding:24px">
      <div style="max-width:560px">
        <h1 style="font-size:24px;margin:0 0 12px">Avvio fallito</h1>
        <p style="opacity:.8;line-height:1.5;margin:0 0 16px">
          L'app non è partita. Prova un hard refresh (<strong>Cmd+Shift+R</strong>) o ricostruisci:
        </p>
        <pre style="background:#141432;padding:16px;border-radius:8px;overflow:auto;font-size:12px;line-height:1.5;white-space:pre-wrap">${message.replace(/</g, "&lt;")}</pre>
        <button onclick="location.reload()" style="margin-top:16px;padding:10px 18px;border-radius:8px;border:none;background:#3b82f6;color:#fff;font-size:14px;cursor:pointer">
          Ricarica
        </button>
      </div>
    </div>`;
}

if (!SUPABASE_URL || !SUPABASE_KEY) {
  showConfigError();
} else {
  migrateLegacyStorageKeys();

  try {
    applyMobilePerformanceBoot();
    applyAdaptiveViewportBoot();
    purgeImmersiveThemeExperiment();
    applyScriptoraAppearance();
    applyVisualPreset();
    applyHubPreferences();
  } catch {
    /* ignore appearance boot errors */
  }

  import("./app-boot.tsx").catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[Scriptora boot]", error);
    showBootError(message);
  });
}
