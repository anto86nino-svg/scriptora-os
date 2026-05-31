// BetaActivationDialog — user enters access code, validated server-side.
// Code is NEVER stored or compared in the frontend.

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Sparkles, KeyRound, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getDeviceId } from "@/lib/device-fingerprint";
import { getCurrentUserId } from "@/services/storageService";
import { toast } from "sonner";
import { useScriptoraModalScrollLock } from "@/lib/viewport-safe";
import { t } from "@/lib/i18n";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onActivated?: () => void;
}

export function BetaActivationDialog({ open, onOpenChange, onActivated }: Props) {
  useScriptoraModalScrollLock(open);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || loading) return;
    setLoading(true);
    setErr(null);
    try {
      const deviceId = await getDeviceId();
      const userId = getCurrentUserId();
      const { data, error } = await supabase.functions.invoke("activate-beta", {
        body: {
          code: code.trim(),
          userId,
          deviceId,
          userAgent: navigator.userAgent,
        },
      });
      if (error) throw new Error(error.message);
      if (!data?.ok) throw new Error(data?.error || t("beta_activation_failed"));

      toast.success("Anteprima editoriale attivata");
      window.dispatchEvent(new Event("nexora-plan-change"));
      setCode("");
      onOpenChange(false);
      onActivated?.();
    } catch (e: any) {
      setErr(t("beta_activation_invalid"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) { setCode(""); setErr(null); }
        onOpenChange(v);
      }}
    >
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <div className="mx-auto h-11 w-11 rounded-full bg-primary/15 flex items-center justify-center mb-2">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <DialogTitle className="text-center">Anteprima editoriale</DialogTitle>
          <DialogDescription className="text-center">
            Inserisci il codice di accesso per sbloccare l&apos;anteprima editoriale.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div className="relative">
            <KeyRound className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              autoFocus
              value={code}
              onChange={(e) => { setCode(e.target.value); setErr(null); }}
              placeholder="Access code"
              disabled={loading}
              className={`w-full h-10 pl-9 pr-3 rounded-md bg-muted/40 border text-sm focus:outline-none focus:ring-2 ${
                err ? "border-destructive ring-destructive/30" : "border-border focus:ring-primary/30"
              }`}
            />
          </div>
          {err && <p className="text-xs text-destructive">{err}</p>}
          <button
            type="submit"
            disabled={loading || !code.trim()}
            className="w-full h-10 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 inline-flex items-center justify-center gap-2"
          >
            {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {loading ? "Attivazione…" : "Attiva anteprima"}
          </button>
          <p className="text-[10px] text-muted-foreground text-center">
            Accesso limitato e tracciato per dispositivo.
          </p>
        </form>
      </DialogContent>
    </Dialog>
  );
}
