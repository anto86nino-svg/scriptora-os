import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { ChevronDown, ChevronUp, Shield, Trash2 } from "lucide-react";
import {
  AUTH_DEBUG_EVENT,
  clearAuthDebugTrace,
  hasOAuthCallbackInUrl,
  readAuthDebugTrace,
  type AuthDebugEntry,
} from "@/lib/auth-debug";
import { useDevMode } from "@/lib/dev-mode";
import { GoogleLogoMark } from "@/components/GoogleLogoMark";

function formatEntry(entry: AuthDebugEntry) {
  const time = entry.at.slice(11, 19);
  const detail =
    entry.details && Object.keys(entry.details).length > 0
      ? ` ${JSON.stringify(entry.details)}`
      : "";
  return `[${time}] ${entry.label}${detail}`;
}

export function AuthDebugPanel() {
  const devOn = useDevMode();
  const location = useLocation();
  const onAuthPage = location.pathname === "/auth";
  const [open, setOpen] = useState(() => onAuthPage && hasOAuthCallbackInUrl());
  const [entries, setEntries] = useState<AuthDebugEntry[]>(() => readAuthDebugTrace());

  useEffect(() => {
    const refresh = () => setEntries(readAuthDebugTrace());
    refresh();
    window.addEventListener(AUTH_DEBUG_EVENT, refresh);
    return () => window.removeEventListener(AUTH_DEBUG_EVENT, refresh);
  }, []);

  useEffect(() => {
    if (onAuthPage && hasOAuthCallbackInUrl()) setOpen(true);
  }, [onAuthPage]);

  const oauthActive = onAuthPage && (hasOAuthCallbackInUrl() || entries.some((e) => /google|oauth|exchange/i.test(e.label)));
  const visible = devOn || oauthActive || (onAuthPage && entries.length > 0);

  if (!visible) return null;

  return (
    <div className="fixed bottom-3 left-3 z-[120] max-w-[min(100vw-1.5rem,22rem)] sm:bottom-4 sm:left-4">
      <div className="overflow-hidden rounded-xl border border-amber-400/25 bg-slate-950/95 text-[10px] font-mono text-amber-100 shadow-2xl backdrop-blur-xl">
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-white/[0.04]"
        >
          {oauthActive ? <GoogleLogoMark className="h-3.5 w-3.5 shrink-0" /> : <Shield className="h-3.5 w-3.5 shrink-0 text-amber-300" />}
          <span className="flex-1 font-semibold uppercase tracking-wider">
            {oauthActive ? "Google Auth Log" : "Auth Debug"}
          </span>
          <span className="rounded bg-amber-400/15 px-1.5 py-0.5 text-[9px] text-amber-200">
            {entries.length}
          </span>
          {open ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />}
        </button>

        {open && (
          <div className="border-t border-white/10 px-2 py-2">
            <div className="max-h-44 space-y-1 overflow-y-auto scrollbar-thin">
              {entries.length === 0 ? (
                <p className="px-1 py-2 text-[10px] text-muted-foreground">Nessun evento auth ancora.</p>
              ) : (
                entries
                  .slice(-12)
                  .reverse()
                  .map((entry, index) => (
                    <pre
                      key={`${entry.at}-${index}`}
                      className="whitespace-pre-wrap break-all rounded bg-black/30 px-2 py-1 text-[9px] leading-4 text-amber-50/90"
                    >
                      {formatEntry(entry)}
                    </pre>
                  ))
              )}
            </div>
            <div className="mt-2 flex items-center justify-between gap-2 px-1">
              <span className="text-[9px] text-muted-foreground">
                {devOn ? "Dev mode attivo" : "Verifica Google in corso"}
              </span>
              <button
                type="button"
                onClick={() => clearAuthDebugTrace()}
                className="inline-flex items-center gap-1 rounded px-2 py-1 text-[9px] text-muted-foreground hover:bg-white/[0.06] hover:text-foreground"
              >
                <Trash2 className="h-3 w-3" />
                Pulisci
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default AuthDebugPanel;
