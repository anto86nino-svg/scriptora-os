import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

/** Legacy route shim — forwards to Book Forge on Dashboard. */
export default function AutoBestsellerRedirectPage() {
  const navigate = useNavigate();

  useEffect(() => {
    navigate("/dashboard", { replace: true, state: { openWizard: true } });
  }, [navigate]);

  return (
    <div className="flex min-h-[40dvh] items-center justify-center px-6 text-center text-sm text-muted-foreground">
      Apertura Book Forge…
    </div>
  );
}
