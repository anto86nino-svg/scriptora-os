import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Lock, ShieldCheck } from "lucide-react";
import { canUseDevTools } from "@/lib/app-environment";
import { tryUnlock } from "@/lib/dev-mode";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUnlocked?: () => void;
}

export function DevModeUnlockDialog({ open, onOpenChange, onUnlocked }: Props) {
  const [pwd, setPwd] = useState("");
  const [err, setErr] = useState(false);

  if (!canUseDevTools()) return null;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (tryUnlock(pwd)) {
      toast.success("Developer Mode attivato");
      setPwd("");
      setErr(false);
      onOpenChange(false);
      onUnlocked?.();
    } else {
      setErr(true);
      setPwd("");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { setPwd(""); setErr(false); } onOpenChange(v); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-primary" /> Restricted Area
          </DialogTitle>
          <DialogDescription>Inserisci la password per accedere.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div className="relative">
            <Lock className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="password"
              autoFocus
              value={pwd}
              onChange={(e) => { setPwd(e.target.value); setErr(false); }}
              placeholder="••••••••"
              className={`w-full h-10 pl-9 pr-3 rounded-md bg-muted/40 border text-sm focus:outline-none focus:ring-2 ${err ? "border-destructive ring-destructive/30" : "border-border focus:ring-primary/30"}`}
            />
          </div>
          {err && <p className="text-xs text-destructive">Password errata.</p>}
          <button
            type="submit"
            className="w-full h-10 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            Sblocca
          </button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
