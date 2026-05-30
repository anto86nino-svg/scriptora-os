import { Loader2 } from "lucide-react";

/** Premium fallback while lazy panels/dialogs load — avoids white flash. */
export function LazyPanelFallback() {
  return (
    <div
      className="fixed inset-0 z-[120] grid place-items-center bg-background/35 backdrop-blur-[2px]"
      aria-hidden
    >
      <div className="flex items-center gap-2 rounded-2xl border border-border/60 bg-card/90 px-4 py-3 text-sm text-muted-foreground shadow-lg">
        <Loader2 className="h-4 w-4 animate-spin text-primary" />
        <span>Loading…</span>
      </div>
    </div>
  );
}
