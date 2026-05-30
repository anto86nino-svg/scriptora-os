import { createRoot } from "react-dom/client";
import "./index.css";
import { isSupabaseConfigured } from "./integrations/supabase/client";
import { buildMissingEnvHints, validateSupabaseEnv } from "./lib/env-validation";

function renderSafeModeScreen() {
  const root = document.getElementById("root");
  if (!root) return;

  const envCheck = validateSupabaseEnv();
  const issues = envCheck.issues
    .map((issue) => `<li style="margin:0 0 8px;line-height:1.5">${issue.message.replace(/</g, "&lt;")}</li>`)
    .join("");

  root.innerHTML = `
    <div style="min-height:100vh;display:grid;place-items:center;background:#0a0a1a;color:#fff;font-family:system-ui;padding:24px">
      <div style="max-width:560px">
        <h1 style="font-size:24px;margin:0 0 12px">SAFE MODE ENABLED</h1>
        <p style="opacity:.8;line-height:1.5;margin:0 0 16px">
          Invalid environment detected. Working credentials protected.
        </p>
        <ul style="opacity:.85;font-size:14px;margin:0 0 16px;padding-left:20px">${issues}</ul>
        <pre style="background:#141432;padding:16px;border-radius:8px;overflow:auto;font-size:13px;line-height:1.6">npm run scriptora:doctor
npm run scriptora:repair</pre>
        <p style="opacity:.7;font-size:13px;margin:16px 0 0">Check <code>.env.local</code> — it may be overriding valid values from <code>.env</code>.</p>
      </div>
    </div>`;
}

function renderMissingEnvScreen() {
  const root = document.getElementById("root");
  if (!root) return;

  const hints = buildMissingEnvHints();
  const hintHtml = hints
    .map((hint) => `<li style="margin:0 0 8px;line-height:1.5">${hint.replace(/</g, "&lt;")}</li>`)
    .join("");

  const envCheck = validateSupabaseEnv();
  const hasUrlOnly =
    envCheck.issues.some((issue) => issue.code === "missing_key") &&
    !envCheck.issues.some((issue) => issue.code === "missing_url");

  root.innerHTML = `
    <div style="min-height:100vh;display:grid;place-items:center;background:#0a0a1a;color:#fff;font-family:system-ui;padding:24px">
      <div style="max-width:560px">
        <h1 style="font-size:24px;margin:0 0 12px">Configurazione mancante</h1>
        <p style="opacity:.8;line-height:1.5;margin:0 0 16px">
          Scriptora non trova credenziali Supabase valide (<code>.env.local</code> o variabili Vercel).
          ${hasUrlOnly ? "L'URL del progetto è presente, ma la chiave pubblica risulta vuota o non valida." : "In locale crea <code>.env.local</code> nella root (copia da <code>.env.example</code>) con:"}
        </p>
        <pre style="background:#141432;padding:16px;border-radius:8px;overflow:auto;font-size:13px;line-height:1.6">VITE_SUPABASE_URL=https://&lt;project&gt;.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=&lt;anon-or-publishable-key&gt;
VITE_SUPABASE_PROJECT_ID=&lt;project-ref&gt;</pre>
        <ul style="opacity:.75;font-size:13px;margin:16px 0 0;padding-left:20px">${hintHtml}</ul>
        <p style="opacity:.65;font-size:12px;margin:16px 0 0">Diagnose: <code>npm run scriptora:doctor</code></p>
      </div>
    </div>`;
}

function renderFatalBootError(message: string) {
  const root = document.getElementById("root");
  if (!root) return;
  root.innerHTML = `
    <div style="min-height:100vh;display:grid;place-items:center;background:#0a0a1a;color:#fff;font-family:system-ui;padding:24px">
      <div style="max-width:560px">
        <h1 style="font-size:24px;margin:0 0 12px">Avvio non riuscito</h1>
        <p style="opacity:.8;line-height:1.5;margin:0 0 16px">L'app non è partita. Dettaglio tecnico:</p>
        <pre style="background:#141432;padding:16px;border-radius:8px;overflow:auto;font-size:13px;line-height:1.6;white-space:pre-wrap">${message.replace(/</g, "&lt;")}</pre>
        <button type="button" onclick="location.reload()" style="margin-top:16px;padding:10px 16px;border-radius:8px;border:none;background:#6366f1;color:#fff;font-weight:600;cursor:pointer">Ricarica</button>
      </div>
    </div>`;
}

window.addEventListener("error", (event) => {
  if (document.getElementById("root")?.innerHTML?.trim()) return;
  renderFatalBootError(event.error?.message || event.message || "Unknown boot error");
});

window.addEventListener("unhandledrejection", (event) => {
  if (document.getElementById("root")?.innerHTML?.trim()) return;
  const reason = event.reason;
  renderFatalBootError(reason instanceof Error ? reason.message : String(reason));
});

async function startApp() {
  const envCheck = validateSupabaseEnv();
  if (envCheck.safeMode) {
    renderSafeModeScreen();
    return;
  }

  if (!isSupabaseConfigured()) {
    renderMissingEnvScreen();
    return;
  }

  try {
    await import("./bootstrap");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[boot]", error);
    renderFatalBootError(message);
  }
}

void startApp();
