import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface OsShellProps {
  title: string;
  subtitle?: string;
  badge?: string;
  backTo?: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
}

export function OsShell({ title, subtitle, badge, backTo = "/dashboard", children, actions }: OsShellProps) {
  const navigate = useNavigate();

  return (
    <div className="min-h-[100dvh] bg-background">
      <header className="sticky top-0 z-40 border-b border-white/8 bg-background/85 backdrop-blur-xl safe-area-pt">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => navigate(backTo)}
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/12 bg-white/[0.05] text-white/70 hover:bg-white/10"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div className="min-w-0">
              {badge && (
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-sky-300/90">{badge}</p>
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
