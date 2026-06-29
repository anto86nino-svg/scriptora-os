import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { resetRouteScroll } from "@/lib/one-flow/dashboard-navigation";

interface OsShellProps {
  title: string;
  subtitle?: string;
  badge?: string;
  backTo?: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
  accent?: "scriptora" | "publishing" | "study" | "market" | "neutral";
}

const ACCENT_CLASS = {
  scriptora: {
    badge: "text-emerald-300/90",
    button: "border-emerald-300/20 bg-emerald-400/10 text-emerald-50 hover:bg-emerald-400/15",
    header: "border-emerald-300/10",
  },
  publishing: {
    badge: "text-amber-200/90",
    button: "border-amber-300/20 bg-amber-400/10 text-amber-50 hover:bg-amber-400/15",
    header: "border-amber-300/10",
  },
  study: {
    badge: "text-sky-200/90",
    button: "border-sky-300/20 bg-sky-400/10 text-sky-50 hover:bg-sky-400/15",
    header: "border-sky-300/10",
  },
  market: {
    badge: "text-violet-200/90",
    button: "border-violet-300/20 bg-violet-400/10 text-violet-50 hover:bg-violet-400/15",
    header: "border-violet-300/10",
  },
  neutral: {
    badge: "text-slate-200/90",
    button: "border-white/12 bg-white/[0.05] text-white/70 hover:bg-white/10",
    header: "border-white/8",
  },
} as const;

export function OsShell({ title, subtitle, badge, backTo = "/dashboard", children, actions, accent = "scriptora" }: OsShellProps) {
  const navigate = useNavigate();
  const theme = ACCENT_CLASS[accent] || ACCENT_CLASS.scriptora;

  return (
    <div className="scriptora-ios-screen scriptora-app-surface scriptora-page-scroll min-h-[100dvh] overflow-x-hidden bg-background">
      <header className={`sticky top-0 z-40 border-b ${theme.header} bg-background/85 backdrop-blur-xl safe-area-pt`}>
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => {
                resetRouteScroll();
                navigate(backTo);
              }}
              className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${theme.button}`}
              aria-label="Torna indietro"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div className="min-w-0">
              {badge && (
                <p className={`text-[10px] font-bold uppercase tracking-[0.18em] ${theme.badge}`}>{badge}</p>
              )}
              <h1 className="truncate text-lg font-bold text-foreground sm:text-xl">{title}</h1>
              {subtitle && <p className="truncate text-xs text-muted-foreground sm:text-sm">{subtitle}</p>}
            </div>
          </div>
          {actions && <div className="shrink-0">{actions}</div>}
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-4 pb-16 sm:px-6 sm:py-6 safe-area-pb">{children}</main>
    </div>
  );
}
