import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";

/** Dedicated launch route — redirects to full-screen Bestseller Engine. */
export default function BestsellerOsPage() {
  const navigate = useNavigate();

  useEffect(() => {
    navigate("/auto-bestseller", { replace: true });
  }, [navigate]);

  return (
    <div className="grid min-h-[100dvh] place-items-center bg-background">
      <div className="text-center">
        <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
        <p className="mt-3 text-sm text-muted-foreground">Apertura Bestseller Engine…</p>
      </div>
    </div>
  );
}
