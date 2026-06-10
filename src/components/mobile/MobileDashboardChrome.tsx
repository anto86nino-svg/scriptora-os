import { useNavigate } from "react-router-dom";
import {
  BarChart3, CreditCard, Download, EllipsisVertical, Fingerprint, ImagePlus,
  LogOut, Music2, Package, UserRound,
} from "lucide-react";
import { GlobalCreditBar } from "@/components/billing/GlobalCreditBar";
import { FocusMusicControl } from "@/components/FocusMusicControl";
import { t } from "@/lib/i18n";

interface MobileDashboardChromeProps {
  showMoreMenu: boolean;
  onToggleMoreMenu: () => void;
  onCloseMoreMenu: () => void;
  onProfile: () => void;
  onCoverStudio: () => void;
  onExportStudio: () => void;
  onAuthorIdentity: () => void;
  onSignOut: () => void;
  showUserActions: boolean;
}

export function MobileDashboardCreditPill() {
  return <GlobalCreditBar variant="mobilePill" />;
}

export function MobileDashboardMoreMenu({
  showMoreMenu,
  onToggleMoreMenu,
  onCloseMoreMenu,
  onProfile,
  onCoverStudio,
  onExportStudio,
  onAuthorIdentity,
  onSignOut,
  showUserActions,
}: MobileDashboardChromeProps) {
  const navigate = useNavigate();

  return (
    <div className="relative md:hidden">
      <button
        type="button"
        onClick={onToggleMoreMenu}
        className="ios-toolbar-button h-8 w-8 px-0"
        title="Altro"
        aria-expanded={showMoreMenu}
        aria-haspopup="menu"
      >
        <EllipsisVertical className="h-4 w-4" />
      </button>
      {showMoreMenu && (
        <>
          <div className="fixed inset-0 z-40" onClick={onCloseMoreMenu} aria-hidden />
          <div
            role="menu"
            className="ios-glass absolute right-0 z-50 mt-1 w-56 rounded-xl border border-white/12 py-1 shadow-2xl"
          >
            {showUserActions && (
              <button
                type="button"
                role="menuitem"
                onClick={() => { onCloseMoreMenu(); onProfile(); }}
                className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-xs text-foreground transition-colors hover:bg-muted/50"
              >
                <UserRound className="h-3.5 w-3.5 text-sky-300" />
                Profilo
              </button>
            )}
            <button
              type="button"
              role="menuitem"
              onClick={() => { onCloseMoreMenu(); navigate("/usage"); }}
              className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-xs text-foreground transition-colors hover:bg-muted/50"
            >
              <BarChart3 className="h-3.5 w-3.5 text-sky-300" />
              Crediti e utilizzo
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => { onCloseMoreMenu(); navigate("/usage?focus=purchase"); }}
              className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-xs text-foreground transition-colors hover:bg-muted/50"
            >
              <CreditCard className="h-3.5 w-3.5 text-emerald-300" />
              Ricarica crediti
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => { onCloseMoreMenu(); onCoverStudio(); }}
              className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-xs text-foreground transition-colors hover:bg-muted/50"
            >
              <ImagePlus className="h-3.5 w-3.5 text-violet-300" />
              Cover Studio
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => { onCloseMoreMenu(); onExportStudio(); }}
              className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-xs text-foreground transition-colors hover:bg-muted/50"
            >
              <Package className="h-3.5 w-3.5 text-amber-300" />
              Export Studio
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => { onCloseMoreMenu(); onAuthorIdentity(); }}
              className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-xs text-foreground transition-colors hover:bg-muted/50"
            >
              <Fingerprint className="h-3.5 w-3.5 text-sky-300" />
              {t("author_identity")}
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => { onCloseMoreMenu(); navigate("/pricing"); }}
              className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-xs text-foreground transition-colors hover:bg-muted/50"
            >
              <CreditCard className="h-3.5 w-3.5 text-white/70" />
              {t("pricing")}
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => { onCloseMoreMenu(); navigate("/downloads"); }}
              className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-xs text-foreground transition-colors hover:bg-muted/50"
            >
              <Download className="h-3.5 w-3.5 text-white/70" />
              {t("downloads")}
            </button>
            <div className="border-t border-white/10 px-3 py-2">
              <p className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-white/45">
                <Music2 className="h-3 w-3" />
                Musica focus
              </p>
              <FocusMusicControl />
            </div>
            {showUserActions && (
              <button
                type="button"
                role="menuitem"
                onClick={() => { onCloseMoreMenu(); onSignOut(); }}
                className="flex w-full items-center gap-2.5 border-t border-white/10 px-3 py-2.5 text-left text-xs text-destructive transition-colors hover:bg-destructive/10"
              >
                <LogOut className="h-3.5 w-3.5" />
                {t("toast_signed_out")}
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
