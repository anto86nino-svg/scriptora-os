import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ScriptoraLogoMark } from "@/components/brand/ScriptoraLogoMark";
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
    badge: "text-[#f2c400]/90",
    button: "border-[#f2c400]/20 bg-[#f2c400]/10 text-[#faf6ee] hover:bg-[#f2c400]/16",
    header: "border-[#f2c400]/14 bg-[#2c1810]/92",
  },
  publishing: {
    badge: "text-amber-200/90",
    button: "border-amber-300/20 bg-amber-400/10 text-amber-50 hover:bg-amber-400/15",
    header: "border-amber-300/12 bg-[#2c1810]/92",
  },
  study: {
    badge: "text-sky-200/90",
    button: "border-sky-300/20 bg-sky-400/10 text-sky-50 hover:bg-sky-400/15",
    header: "border-sky-300/12 bg-[#2c1810]/92",
  },
  market: {
    badge: "text-violet-200/90",
    button: "border-violet-300/20 bg-violet-400/10 text-violet-50 hover:bg-violet-400/15",
    header: "border-violet-300/12 bg-[#2c1810]/92",
  },
  neutral: {
    badge: "text-[#f4ead8]/80",
    button: "border-[#f4ead8]/14 bg-[#f4ead8]/[0.06] text-[#faf6ee]/78 hover:bg-[#f4ead8]/10",
    header: "border-[#8b5a2b]/20 bg-[#2c1810]/92",
  },
} as const;

export function OsShell({ title, subtitle, badge, backTo = "/dashboard", children, actions, accent = "scriptora" }: OsShellProps) {
  const navigate = useNavigate();
  const theme = ACCENT_CLASS[accent] || ACCENT_CLASS.scriptora;

  return (
    <div className="scriptora-ios-screen scriptora-app-surface scriptora-literary-shell scriptora-page-scroll relative min-h-[100dvh] overflow-x-hidden">
      <header className={`sticky top-0 z-40 border-b ${theme.header} backdrop-blur-xl safe-area-pt`}>
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
            <ScriptoraLogoMark size="xs" className="hidden sm:inline-flex" />
            <div className="min-w-0">
              {badge && (
                <p className={`text-[10px] font-bold uppercase tracking-[0.18em] ${theme.badge}`}>{badge}</p>
              )}
              <h1 className="truncate text-lg font-bold text-[#faf6ee] sm:text-xl">{title}</h1>
              {subtitle && <p className="truncate text-xs text-[#f4ead8]/68 sm:text-sm">{subtitle}</p>}
            </div>
          </div>
          {actions && <div className="shrink-0">{actions}</div>}
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-4 pb-16 text-[#1a1209] sm:px-6 sm:py-6 safe-area-pb">{children}</main>
    </div>
  );
}
