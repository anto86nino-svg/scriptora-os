import { useState } from "react";
import { LogIn, LogOut, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";

interface AuthSessionButtonProps {
  className?: string;
  variant?: "toolbar" | "button" | "pill";
}

export function AuthSessionButton({ className, variant = "toolbar" }: AuthSessionButtonProps) {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);

  if (loading) return null;

  const baseClass =
    variant === "pill"
      ? "inline-flex h-7 items-center gap-1 rounded-full border border-white/12 bg-white/[0.06] px-2.5 text-[10px] font-semibold text-foreground hover:bg-white/[0.1]"
      : variant === "button"
        ? "inline-flex h-8 items-center gap-1.5 rounded-lg border border-border px-3 text-[11px] font-medium text-muted-foreground hover:bg-muted/40 hover:text-foreground"
        : "ios-toolbar-button h-7 px-2 text-[10px] font-semibold";

  if (!user) {
    return (
      <button
        type="button"
        className={cn(baseClass, className)}
        onClick={() => navigate("/auth")}
      >
        <LogIn className="h-3 w-3" />
        <span>{t("sign_in")}</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      disabled={busy}
      className={cn(baseClass, variant === "toolbar" && "hover:text-destructive", className)}
      onClick={async () => {
        setBusy(true);
        try {
          await signOut();
          toast.success(t("toast_signed_out"));
          navigate("/auth", { replace: true });
        } catch {
          toast.error("Logout non riuscito. Riprova.");
        } finally {
          setBusy(false);
        }
      }}
    >
      {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <LogOut className="h-3 w-3" />}
      <span>{t("sign_out")}</span>
    </button>
  );
}
